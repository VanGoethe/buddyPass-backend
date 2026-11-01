import { PrismaClient } from "@prisma/client";

export interface RevealView {
  id: string;
  actorUserId: string;
  slotId: string;
  subscriptionId: string;
  createdAt: string;
}

export interface IRevealStore {
  record(input: {
    actorUserId: string;
    slotId: string;
    subscriptionId: string;
  }): Promise<void>;
  listBySubscription(subscriptionId: string): Promise<RevealView[]>;
}

export class PrismaRevealStore implements IRevealStore {
  constructor(private prisma: PrismaClient) {}

  async record(input: {
    actorUserId: string;
    slotId: string;
    subscriptionId: string;
  }): Promise<void> {
    await this.prisma.credentialReveal.create({ data: input });
  }

  async listBySubscription(subscriptionId: string): Promise<RevealView[]> {
    const rows = await this.prisma.credentialReveal.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      slotId: row.slotId,
      subscriptionId: row.subscriptionId,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
