import { LoginCodeClaimStatus, Prisma, PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { INotificationPublisher, LoginCodeStatusPush } from "../../realtime";
import { IInboxReader } from "../inbox";
import { inboxIsConfigured } from "../inbox/imapInboxClient";
import { ISeatAccess, SeatAccessSlot } from "../payments";
import { ForbiddenError, InboxUnavailableError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { queuedStart } from "./estimate";

const OPEN_STATUSES: LoginCodeClaimStatus[] = ["QUEUED", "ACTIVE"];

export interface CodeRequestView {
  claimId: string;
  phase: "active" | "queued";
  position: number;
  estimatedStartAt: string | null;
  watchingUntil: string | null;
  loginCode?: string;
}

interface ClaimRow {
  id: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  status: LoginCodeClaimStatus;
  openedAt: Date;
  activatedAt: Date | null;
  expiresAt: Date | null;
}

export class LoginCodeQueue {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaClient,
    private inbox: IInboxReader,
    private publisher: INotificationPublisher,
    private seatAccess: ISeatAccess,
    private configured: () => boolean = inboxIsConfigured
  ) {}

  async request(userId: string, slotId: string): Promise<CodeRequestView> {
    const slot = await this.ownedSlot(userId, slotId);
    await this.requirePaid(slot);
    if (!this.configured()) {
      throw new InboxUnavailableError();
    }
    const claim = await this.join(slot);
    this.startWatch();
    let loginCode: string | undefined;
    if (claim.status === "ACTIVE") {
      await this.inbox.poll();
      const matched = await this.prisma.loginCode.findFirst({
        where: { claimId: claim.id },
        orderBy: { receivedAt: "desc" },
      });
      if (matched) {
        loginCode = matched.code;
      }
    }
    const view = await this.present(claim.id);
    if (loginCode) {
      return { ...view, loginCode };
    }
    return view;
  }

  startWatch(): void {
    if (this.timer) {
      return;
    }
    const ms = env.LOGIN_CODE_WATCH_INTERVAL_SECONDS * 1000;
    this.timer = setInterval(() => {
      void this.tick();
    }, ms);
    this.timer.unref?.();
  }

  stopWatch(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  async maintain(): Promise<number> {
    const stored = await this.inbox.poll();
    const promoted = await this.expireDue(new Date());
    if (promoted) {
      await this.inbox.poll();
    }
    await this.refreshQueued(new Date());
    if (!(await this.hasOpen())) {
      this.stopWatch();
    }
    return stored;
  }

  async findActive(subscriptionId: string): Promise<{
    id: string;
    slotId: string;
    userId: string;
    activatedAt: Date;
    slot: SeatAccessSlot;
  } | null> {
    const claim = await this.prisma.loginCodeClaim.findFirst({
      where: { subscriptionId, status: "ACTIVE" },
      include: {
        slot: {
          select: { id: true, access: true, termStartsAt: true, termEndsAt: true },
        },
      },
    });
    if (!claim?.activatedAt) {
      return null;
    }
    return {
      id: claim.id,
      slotId: claim.slotId,
      userId: claim.userId,
      activatedAt: claim.activatedAt,
      slot: claim.slot,
    };
  }

  async afterMatch(input: {
    claimId: string;
    subscriptionId: string;
    slotId: string;
  }): Promise<void> {
    const now = new Date();
    const closed = await this.prisma.loginCodeClaim.updateMany({
      where: { id: input.claimId, status: "ACTIVE" },
      data: { status: "MATCHED", openAccountKey: null, closedAt: now },
    });
    await this.resolveHelp(input.slotId, "INBOX", null, now);
    if (closed.count > 0) {
      await this.promoteNext(input.subscriptionId, now);
    }
  }

  async closeSeatClaim(
    slotId: string,
    subscriptionId: string,
    resolvedByUserId: string
  ): Promise<void> {
    const now = new Date();
    const open = await this.prisma.loginCodeClaim.findFirst({
      where: { slotId, status: { in: OPEN_STATUSES } },
      orderBy: { openedAt: "desc" },
    });
    if (open) {
      await this.prisma.loginCodeClaim.update({
        where: { id: open.id },
        data: { status: "MATCHED", openAccountKey: null, closedAt: now },
      });
    }
    await this.resolveHelp(slotId, "ADMIN", resolvedByUserId, now);
    if (open?.status === "ACTIVE") {
      await this.promoteNext(subscriptionId, now);
    }
  }

  async expireDue(now: Date): Promise<boolean> {
    const due = await this.prisma.loginCodeClaim.findMany({
      where: { status: "ACTIVE", expiresAt: { lt: now } },
    });
    let promoted = false;
    for (const claim of due) {
      const closed = await this.prisma.loginCodeClaim.updateMany({
        where: { id: claim.id, status: "ACTIVE" },
        data: { status: "EXPIRED", openAccountKey: null, closedAt: now },
      });
      if (closed.count === 0) {
        continue;
      }
      this.publisher.publishLoginCodeMissed(claim.userId, { slotId: claim.slotId });
      await this.promoteNext(claim.subscriptionId, now);
      promoted = true;
    }
    return promoted;
  }

  private async tick(): Promise<void> {
    try {
      await this.maintain();
    } catch (error) {
      logger.error({ err: error }, "Login code watch failed");
    }
  }

  private async join(slot: { id: string; userId: string; subscriptionId: string }): Promise<ClaimRow> {
    const existing = await this.prisma.loginCodeClaim.findFirst({
      where: { slotId: slot.id, userId: slot.userId, status: { in: OPEN_STATUSES } },
      orderBy: { openedAt: "desc" },
    });
    if (existing?.status === "ACTIVE") {
      const expiresAt = new Date(Date.now() + env.LOGIN_CODE_WATCH_SECONDS * 1000);
      return this.prisma.loginCodeClaim.update({
        where: { id: existing.id },
        data: { expiresAt },
      });
    }
    if (existing?.status === "QUEUED") {
      return existing;
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const active = await tx.loginCodeClaim.findFirst({
          where: { subscriptionId: slot.subscriptionId, status: "ACTIVE" },
        });
        if (active) {
          return tx.loginCodeClaim.create({ data: queuedData(slot) });
        }
        return tx.loginCodeClaim.create({ data: activeData(slot, new Date()) });
      });
    } catch (error) {
      if (!isUnique(error)) {
        throw error;
      }
      return this.prisma.loginCodeClaim.create({ data: queuedData(slot) });
    }
  }

  private async promoteNext(subscriptionId: string, now: Date): Promise<void> {
    const next = await this.prisma.loginCodeClaim.findFirst({
      where: { subscriptionId, status: "QUEUED" },
      orderBy: { openedAt: "asc" },
    });
    if (!next) {
      await this.refreshAccount(subscriptionId, now);
      return;
    }
    const expiresAt = new Date(now.getTime() + env.LOGIN_CODE_WATCH_SECONDS * 1000);
    try {
      const updated = await this.prisma.loginCodeClaim.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: {
          status: "ACTIVE",
          activatedAt: now,
          expiresAt,
          openAccountKey: subscriptionId,
        },
      });
      if (updated.count === 0) {
        return;
      }
    } catch (error) {
      if (isUnique(error)) {
        return;
      }
      throw error;
    }
    this.publisher.publishLoginCodeStatus(next.userId, {
      slotId: next.slotId,
      phase: "active",
      position: 0,
      estimatedStartAt: null,
      watchingUntil: expiresAt.toISOString(),
    });
    await this.refreshAccount(subscriptionId, now);
  }

  private async refreshQueued(now: Date): Promise<void> {
    const queued = await this.prisma.loginCodeClaim.findMany({
      where: { status: "QUEUED" },
      select: { subscriptionId: true },
    });
    const accounts = [...new Set(queued.map((row) => row.subscriptionId))];
    for (const subscriptionId of accounts) {
      await this.refreshAccount(subscriptionId, now);
    }
  }

  private async refreshAccount(subscriptionId: string, now: Date): Promise<void> {
    const [active, waiting] = await Promise.all([
      this.prisma.loginCodeClaim.findFirst({
        where: { subscriptionId, status: "ACTIVE" },
        select: { activatedAt: true },
      }),
      this.prisma.loginCodeClaim.findMany({
        where: { subscriptionId, status: "QUEUED" },
        orderBy: { openedAt: "asc" },
      }),
    ]);
    waiting.forEach((claim, index) => {
      const timing = queuedStart(
        now,
        index,
        active?.activatedAt ?? null,
        env.LOGIN_CODE_TURN_ESTIMATE_SECONDS
      );
      const push: LoginCodeStatusPush = {
        slotId: claim.slotId,
        phase: "queued",
        position: timing.position,
        estimatedStartAt: timing.estimatedStartAt.toISOString(),
        watchingUntil: null,
      };
      this.publisher.publishLoginCodeStatus(claim.userId, push);
    });
  }

  private async present(claimId: string): Promise<CodeRequestView> {
    const claim = await this.prisma.loginCodeClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundError("Verification request not found");
    }
    if (claim.status !== "QUEUED") {
      return {
        claimId: claim.id,
        phase: "active",
        position: 0,
        estimatedStartAt: null,
        watchingUntil:
          claim.status === "ACTIVE" ? claim.expiresAt?.toISOString() ?? null : null,
      };
    }
    const [active, queuedAhead] = await Promise.all([
      this.prisma.loginCodeClaim.findFirst({
        where: { subscriptionId: claim.subscriptionId, status: "ACTIVE" },
        select: { activatedAt: true },
      }),
      this.prisma.loginCodeClaim.count({
        where: {
          subscriptionId: claim.subscriptionId,
          status: "QUEUED",
          openedAt: { lt: claim.openedAt },
        },
      }),
    ]);
    const timing = queuedStart(
      new Date(),
      queuedAhead,
      active?.activatedAt ?? null,
      env.LOGIN_CODE_TURN_ESTIMATE_SECONDS
    );
    return {
      claimId: claim.id,
      phase: "queued",
      position: timing.position,
      estimatedStartAt: timing.estimatedStartAt.toISOString(),
      watchingUntil: null,
    };
  }

  private async hasOpen(): Promise<boolean> {
    const count = await this.prisma.loginCodeClaim.count({
      where: { status: { in: OPEN_STATUSES } },
    });
    return count > 0;
  }

  private async ownedSlot(userId: string, slotId: string): Promise<SeatAccessSlot & {
    userId: string;
    subscriptionId: string;
  }> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        userId: true,
        subscriptionId: true,
        isActive: true,
        releasedAt: true,
        access: true,
        termStartsAt: true,
        termEndsAt: true,
      },
    });
    if (!slot || !slot.isActive || slot.releasedAt) {
      throw new NotFoundError("Slot not found");
    }
    if (slot.userId !== userId) {
      throw new ForbiddenError("You cannot access this slot");
    }
    return slot;
  }

  private async requirePaid(slot: SeatAccessSlot): Promise<void> {
    const allowed = await this.seatAccess.customerCanUseSeat(slot);
    if (!allowed) {
      throw new ForbiddenError(
        "Verification codes are available after payment is confirmed",
        "PAYMENT_REQUIRED"
      );
    }
  }

  private async resolveHelp(
    slotId: string,
    resolvedBy: "INBOX" | "ADMIN",
    resolvedByUserId: string | null,
    now: Date
  ): Promise<void> {
    await this.prisma.loginCodeHelp.updateMany({
      where: { slotId, status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        resolvedBy,
        resolvedByUserId,
        openSlotKey: null,
      },
    });
  }
}

function activeData(
  slot: { id: string; userId: string; subscriptionId: string },
  now: Date
): Prisma.LoginCodeClaimCreateInput {
  return {
    status: "ACTIVE",
    openedAt: now,
    activatedAt: now,
    expiresAt: new Date(now.getTime() + env.LOGIN_CODE_WATCH_SECONDS * 1000),
    openAccountKey: slot.subscriptionId,
    slot: { connect: { id: slot.id } },
    user: { connect: { id: slot.userId } },
    subscription: { connect: { id: slot.subscriptionId } },
  };
}

function queuedData(slot: {
  id: string;
  userId: string;
  subscriptionId: string;
}): Prisma.LoginCodeClaimCreateInput {
  return {
    status: "QUEUED",
    slot: { connect: { id: slot.id } },
    user: { connect: { id: slot.userId } },
    subscription: { connect: { id: slot.subscriptionId } },
  };
}

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
