import { PrismaClient } from "@prisma/client";
import { INotificationPublisher, SeatReadyPush } from "../../realtime";
import { logger } from "../../utils/logger";

export interface SeatHandoffInput {
  paymentId: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  renewed: boolean;
}

export interface ISeatHandoff {
  afterPaid(input: SeatHandoffInput): Promise<void>;
}

export class SeatHandoff implements ISeatHandoff {
  constructor(
    private prisma: PrismaClient,
    private publisher: INotificationPublisher
  ) {}

  async afterPaid(input: SeatHandoffInput): Promise<void> {
    try {
      const slot = await this.prisma.subscriptionSlot.findUnique({
        where: { id: input.slotId },
        select: {
          termEndsAt: true,
          subscription: {
            select: { serviceProvider: { select: { name: true } } },
          },
        },
      });
      if (!slot) {
        logger.error(
          { paymentId: input.paymentId, slotId: input.slotId },
          "Seat handoff could not load the seat"
        );
        return;
      }
      const payload: SeatReadyPush = {
        slotId: input.slotId,
        subscriptionId: input.subscriptionId,
        serviceName: slot.subscription.serviceProvider.name,
        termEndsAt: slot.termEndsAt?.toISOString() ?? null,
        renewed: input.renewed,
      };
      this.publisher.publishSeatReady(input.userId, payload);
    } catch (error) {
      logger.error(
        { err: error, paymentId: input.paymentId, slotId: input.slotId },
        "Seat handoff failed"
      );
    }
  }
}
