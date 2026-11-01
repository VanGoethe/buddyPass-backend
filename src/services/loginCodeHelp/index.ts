import { Prisma, PrismaClient } from "@prisma/client";
import { INotificationPublisher, LoginCodePush } from "../../realtime";
import { LoginCodeQueue } from "../loginCodes";
import { INotificationService } from "../notifications";
import { ISeatAccess } from "../payments";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";

export interface CodeHelpView {
  id: string;
  slotId: string;
  userId: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  customerName: string | null;
  customerEmail: string;
  serviceName: string;
  accountName: string;
  accountEmail: string;
  claimOpenedAt: string | null;
}

export class LoginCodeHelpService {
  constructor(
    private prisma: PrismaClient,
    private queue: LoginCodeQueue,
    private publisher: INotificationPublisher,
    private notifications: INotificationService,
    private seatAccess: ISeatAccess
  ) {}

  async request(userId: string, slotId: string): Promise<{ help: CodeHelpView; created: boolean }> {
    const slot = await this.ownedSlot(userId, slotId);
    const allowed = await this.seatAccess.customerCanUseSeat(slot);
    if (!allowed) {
      throw new ForbiddenError(
        "Verification codes are available after payment is confirmed",
        "PAYMENT_REQUIRED"
      );
    }
    const existing = await this.prisma.loginCodeHelp.findFirst({
      where: { slotId, status: "OPEN" },
    });
    if (existing) {
      return { help: await this.loadView(existing.id), created: false };
    }
    const claim = await this.prisma.loginCodeClaim.findFirst({
      where: { slotId, userId, status: { in: ["QUEUED", "ACTIVE"] } },
      orderBy: { openedAt: "desc" },
    });
    let created;
    try {
      created = await this.prisma.loginCodeHelp.create({
        data: {
          slotId,
          userId,
          subscriptionId: slot.subscriptionId,
          claimId: claim?.id,
          openSlotKey: slotId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.prisma.loginCodeHelp.findFirst({
          where: { slotId, status: "OPEN" },
        });
        if (raced) {
          return { help: await this.loadView(raced.id), created: false };
        }
      }
      throw error;
    }
    const view = await this.loadView(created.id);
    const who = view.customerName
      ? `${view.customerName} (${view.customerEmail})`
      : view.customerEmail;
    await this.notifications.notifyAdminsAboutCodeHelp({
      body: `${who} needs a verification code for ${view.serviceName} account "${view.accountName}" (${view.accountEmail}). Asked at ${view.createdAt}.`,
      subject: "Verification code needed",
      slotId,
      subscriptionId: slot.subscriptionId,
      helpId: created.id,
    });
    return { help: view, created: true };
  }

  async list(status: "OPEN" | "RESOLVED" = "OPEN"): Promise<CodeHelpView[]> {
    const rows = await this.prisma.loginCodeHelp.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true },
    });
    const views: CodeHelpView[] = [];
    for (const row of rows) {
      views.push(await this.loadView(row.id));
    }
    return views;
  }

  async countOpen(): Promise<number> {
    return this.prisma.loginCodeHelp.count({ where: { status: "OPEN" } });
  }

  async enterCode(slotId: string, code: string, adminUserId: string): Promise<void> {
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
    const allowed = await this.seatAccess.customerCanUseSeat(slot);
    if (!allowed) {
      throw new ConflictError(
        "Verification codes are available after payment is confirmed",
        "PAYMENT_REQUIRED"
      );
    }
    const receivedAt = new Date();
    await this.prisma.loginCode.create({
      data: {
        slotId: slot.id,
        alias: "admin",
        code,
        source: "ADMIN",
        receivedAt,
      },
    });
    const push: LoginCodePush = {
      slotId: slot.id,
      code,
      receivedAt: receivedAt.toISOString(),
      source: "ADMIN",
    };
    this.publisher.publishLoginCode(slot.userId, push);
    await this.notifications.notifyCodeSentByAdmin({
      userId: slot.userId,
      slotId: slot.id,
      subscriptionId: slot.subscriptionId,
    });
    await this.queue.closeSeatClaim(slot.id, slot.subscriptionId, adminUserId);
  }

  private async ownedSlot(userId: string, slotId: string): Promise<{
    id: string;
    userId: string;
    subscriptionId: string;
    access: "AWAITING_PAYMENT" | "ACTIVE" | "BLOCKED";
    termStartsAt: Date | null;
    termEndsAt: Date | null;
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

  private async loadView(id: string): Promise<CodeHelpView> {
    const row = await this.prisma.loginCodeHelp.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        subscription: {
          select: {
            name: true,
            email: true,
            serviceProvider: { select: { name: true } },
          },
        },
        claim: { select: { openedAt: true } },
      },
    });
    if (!row) {
      throw new NotFoundError("Help request not found");
    }
    return {
      id: row.id,
      slotId: row.slotId,
      userId: row.userId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      customerName: row.user.name,
      customerEmail: row.user.email,
      serviceName: row.subscription.serviceProvider.name,
      accountName: row.subscription.name,
      accountEmail: row.subscription.email,
      claimOpenedAt: row.claim?.openedAt.toISOString() ?? null,
    };
  }
}
