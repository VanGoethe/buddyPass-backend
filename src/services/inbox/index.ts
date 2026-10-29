import { PrismaClient } from "@prisma/client";
import { IInboxClient } from "./imapInboxClient";
import { logger } from "../../utils/logger";

const CODE_WINDOW_MS = 15 * 60 * 1000;

export interface LoginCodeView {
  id: string;
  slotId: string | null;
  alias: string;
  code: string;
  receivedAt: string;
}

export interface IInboxReader {
  getRecentCode(slotId: string): Promise<LoginCodeView | null>;
}

export class InboxService implements IInboxReader {
  constructor(
    private prisma: PrismaClient,
    private client: IInboxClient
  ) {}

  async poll(): Promise<number> {
    let messages;
    try {
      messages = await this.client.fetchUnseen();
    } catch (error) {
      logger.error({ err: error }, "Inbox poll failed");
      return 0;
    }
    let stored = 0;
    for (const message of messages) {
      if (!message.code) {
        continue;
      }
      const slot = message.alias
        ? await this.prisma.subscriptionSlot.findUnique({
            where: { aliasLocalPart: message.alias },
            select: { id: true },
          })
        : null;
      await this.prisma.loginCode.create({
        data: {
          slotId: slot?.id,
          alias: message.alias ?? "unmatched",
          code: message.code,
          receivedAt: message.receivedAt,
        },
      });
      stored += 1;
    }
    return stored;
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
    return {
      id: row.id,
      slotId: row.slotId,
      alias: row.alias,
      code: row.code,
      receivedAt: row.receivedAt.toISOString(),
    };
  }

  async listUnmatched(): Promise<LoginCodeView[]> {
    const rows = await this.prisma.loginCode.findMany({
      where: { slotId: null },
      orderBy: { receivedAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      slotId: row.slotId,
      alias: row.alias,
      code: row.code,
      receivedAt: row.receivedAt.toISOString(),
    }));
  }
}
