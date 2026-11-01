import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { INotificationPublisher, LoginCodePush } from "../../realtime";
import { ISeatAccess, SeatAccessSlot } from "../payments";
import { logger } from "../../utils/logger";
import { IInboxClient, InboundMail } from "./imapInboxClient";
import { extractCode, seatAliasFrom, senderAllowed } from "./parseLoginMessage";

const CODE_WINDOW_MS = 15 * 60 * 1000;

export interface LoginCodeView {
  id: string;
  slotId: string | null;
  alias: string;
  code: string;
  source: "INBOX" | "ADMIN";
  receivedAt: string;
}

export interface ActiveCodeClaim {
  id: string;
  slotId: string;
  userId: string;
  activatedAt: Date;
  slot: SeatAccessSlot;
}

export interface ILoginCodeClaims {
  findActive(subscriptionId: string): Promise<ActiveCodeClaim | null>;
  afterMatch(input: { claimId: string; subscriptionId: string; slotId: string }): Promise<void>;
}

export interface IInboxReader {
  getRecentCode(slotId: string): Promise<LoginCodeView | null>;
  poll(): Promise<number>;
}

type UnmatchedReason = "no_account" | "sender_not_allowed" | "no_claim" | "stale" | "unpaid";

export class InboxService implements IInboxReader {
  private flight: Promise<number> | null = null;
  private again = false;
  private claims: ILoginCodeClaims | null = null;

  constructor(
    private prisma: PrismaClient,
    private client: IInboxClient,
    private publisher: INotificationPublisher,
    private seatAccess: ISeatAccess
  ) {}

  setClaims(claims: ILoginCodeClaims): void {
    this.claims = claims;
  }

  async poll(): Promise<number> {
    if (this.flight) {
      return this.flight;
    }
    const run = async (): Promise<number> => {
      let total = 0;
      let passes = 0;
      do {
        this.again = false;
        total += await this.pollOnce();
        passes += 1;
      } while (this.again && passes < 8);
      return total;
    };
    this.flight = run().finally(() => {
      this.flight = null;
    });
    return this.flight;
  }

  async getRecentCode(slotId: string): Promise<LoginCodeView | null> {
    const since = new Date(Date.now() - CODE_WINDOW_MS);
    const row = await this.prisma.loginCode.findFirst({
      where: { slotId, receivedAt: { gte: since } },
      orderBy: { receivedAt: "desc" },
    });
    if (!row) {
      return null;
    }
    return toView(row);
  }

  async listUnmatched(): Promise<LoginCodeView[]> {
    const rows = await this.prisma.loginCode.findMany({
      where: { slotId: null },
      orderBy: { receivedAt: "desc" },
      take: 100,
    });
    return rows.map(toView);
  }

  private async pollOnce(): Promise<number> {
    let messages: InboundMail[];
    try {
      messages = await this.client.fetchUnseen();
    } catch (error) {
      logger.error({ err: error }, "Inbox poll failed");
      return 0;
    }
    let stored = 0;
    for (const message of messages) {
      try {
        stored += await this.deliver(message);
      } catch (error) {
        logger.error({ err: error }, "Login code delivery failed");
      }
    }
    return stored;
  }

  private async deliver(message: InboundMail): Promise<number> {
    const alias = seatAliasFrom(message.recipients, env.INBOX_DOMAIN);
    if (alias) {
      const aliasResult = await this.deliverAlias(alias, message);
      if (aliasResult !== "fallthrough") {
        return aliasResult;
      }
    }
    return this.deliverAccount(message);
  }

  private async deliverAlias(alias: string, message: InboundMail): Promise<number | "fallthrough"> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { aliasLocalPart: alias },
      select: {
        id: true,
        userId: true,
        access: true,
        termStartsAt: true,
        termEndsAt: true,
      },
    });
    if (!slot) {
      return "fallthrough";
    }
    const code = extractCode(message.text);
    if (!code) {
      return 0;
    }
    const paid = await this.seatAccess.customerCanUseSeat(slot);
    if (!paid) {
      return this.unmatched(message, code, "unpaid");
    }
    await this.store({
      slotId: slot.id,
      alias,
      code,
      receivedAt: message.receivedAt,
    });
    this.pushUser(slot.userId, slot.id, code, message.receivedAt);
    return 1;
  }

  private async deliverAccount(message: InboundMail): Promise<number> {
    if (message.recipients.length === 0) {
      return this.unmatched(message, extractCode(message.text), "no_account");
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: message.recipients.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      },
      select: {
        id: true,
        email: true,
        serviceProvider: { select: { codeSenderDomains: true, codePattern: true } },
      },
    });
    if (!subscription) {
      return this.unmatched(message, extractCode(message.text), "no_account");
    }
    const code = extractCode(message.text, subscription.serviceProvider.codePattern);
    if (!senderAllowed(message.from, subscription.serviceProvider.codeSenderDomains)) {
      return this.unmatched(message, code, "sender_not_allowed");
    }
    if (!code) {
      return 0;
    }
    const claim = this.claims ? await this.claims.findActive(subscription.id) : null;
    if (!claim) {
      return this.unmatched(message, code, "no_claim");
    }
    const skewMs = env.LOGIN_CODE_CLOCK_SKEW_SECONDS * 1000;
    if (message.receivedAt.getTime() < claim.activatedAt.getTime() - skewMs) {
      return this.unmatched(message, code, "stale");
    }
    const paid = await this.seatAccess.customerCanUseSeat(claim.slot);
    if (!paid) {
      return this.unmatched(message, code, "unpaid");
    }
    await this.store({
      slotId: claim.slotId,
      claimId: claim.id,
      alias: subscription.email,
      code,
      receivedAt: message.receivedAt,
    });
    this.pushUser(claim.userId, claim.slotId, code, message.receivedAt);
    if (this.claims) {
      await this.claims.afterMatch({
        claimId: claim.id,
        subscriptionId: subscription.id,
        slotId: claim.slotId,
      });
      this.again = true;
    }
    return 1;
  }

  private async unmatched(
    message: InboundMail,
    code: string | null,
    reason: UnmatchedReason
  ): Promise<number> {
    if (!code) {
      return 0;
    }
    logger.info({ reason }, "Login code was not delivered");
    await this.store({ alias: "unmatched", code, receivedAt: message.receivedAt });
    const push: LoginCodePush = {
      slotId: null,
      code,
      receivedAt: message.receivedAt.toISOString(),
      source: "INBOX",
    };
    try {
      this.publisher.publishToAdmins("login-code", push);
    } catch (error) {
      logger.error({ err: error, reason }, "Login code push failed");
    }
    return 1;
  }

  private async store(input: {
    slotId?: string;
    claimId?: string;
    alias: string;
    code: string;
    receivedAt: Date;
  }): Promise<void> {
    await this.prisma.loginCode.create({
      data: {
        slotId: input.slotId,
        claimId: input.claimId,
        alias: input.alias,
        code: input.code,
        source: "INBOX",
        receivedAt: input.receivedAt,
      },
    });
  }

  private pushUser(userId: string, slotId: string, code: string, receivedAt: Date): void {
    try {
      this.publisher.publishLoginCode(userId, {
        slotId,
        code,
        receivedAt: receivedAt.toISOString(),
        source: "INBOX",
      });
    } catch (error) {
      logger.error({ err: error, slotId }, "Login code push failed");
    }
  }
}

function toView(row: {
  id: string;
  slotId: string | null;
  alias: string;
  code: string;
  source: "INBOX" | "ADMIN";
  receivedAt: Date;
}): LoginCodeView {
  return {
    id: row.id,
    slotId: row.slotId,
    alias: row.alias,
    code: row.code,
    source: row.source,
    receivedAt: row.receivedAt.toISOString(),
  };
}
