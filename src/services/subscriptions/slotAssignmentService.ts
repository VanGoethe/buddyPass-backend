import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { ICapacityForecastService } from "../../types/capacity";
import {
  ISlotAssignmentService,
  ISubscriptionSlot,
  selectSubscriptionForAllocation,
  SlotCandidate,
} from "../../types/subscriptions";
import { INotificationService } from "../notifications";
import { logger } from "../../utils/logger";

const MAX_ATTEMPTS = 8;

function isRetryable(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    return code === "P2034" || code === "40001";
  }
  return false;
}

export class SlotAssignmentService implements ISlotAssignmentService {
  constructor(
    private prisma: PrismaClient,
    private capacityForecast?: ICapacityForecastService,
    private notifications?: INotificationService
  ) {}

  async assignSlotToUser(
    userId: string,
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<{
    success: boolean;
    slotAssignment?: ISubscriptionSlot;
    message: string;
  }> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await this.prisma.$transaction(
          (tx) => this.allocate(tx, userId, serviceProviderId, countryId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        if (result.success && result.slotAssignment) {
          await this.notifications?.notifySeatChange({
            userId,
            slotId: result.slotAssignment.id,
            subscriptionId: result.slotAssignment.subscriptionId,
            action: "assigned",
          });
        }
        return result;
      } catch (error) {
        if (isRetryable(error) && attempt < MAX_ATTEMPTS) {
          continue;
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return {
            success: false,
            message: "You already have a slot assigned for this service provider",
          };
        }
        logger.error({ err: error }, "Slot allocation failed");
        return { success: false, message: "Failed to assign slot" };
      }
    }
    return { success: false, message: "Failed to assign slot" };
  }

  async processPending(
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<number> {
    const pending = await this.prisma.subscriptionRequest.findMany({
      where: {
        serviceProviderId,
        status: "PENDING",
        ...(countryId ? { countryId } : {}),
      },
      orderBy: { requestedAt: "asc" },
    });

    let assigned = 0;
    for (const request of pending) {
      const result = await this.assignSlotToUser(
        request.userId,
        serviceProviderId,
        request.countryId
      );
      if (!result.success || !result.slotAssignment) {
        if (result.message.startsWith("You already have")) {
          continue;
        }
        break;
      }
      await this.prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: {
          status: "ASSIGNED",
          assignedSlotId: result.slotAssignment.id,
          processedAt: new Date(),
        },
      });
      assigned += 1;
    }
    await this.refreshCapacity(serviceProviderId);
    return assigned;
  }

  async sweepSeatTerms(): Promise<{
    releasedHolds: number;
    blocked: number;
    releasedBlocked: number;
  }> {
    const now = new Date();
    const holdBefore = new Date(
      now.getTime() - env.SEAT_PAYMENT_HOLD_HOURS * 60 * 60 * 1000
    );
    const graceBefore = new Date(
      now.getTime() - env.SEAT_BLOCK_GRACE_DAYS * 24 * 60 * 60 * 1000
    );
    const releasedHolds = await this.releaseMatching(
      {
        access: "AWAITING_PAYMENT",
        isActive: true,
        releasedAt: null,
        assignedAt: { lte: holdBefore },
      },
      "freed"
    );
    let blocked = 0;
    try {
      const due = await this.prisma.subscriptionSlot.findMany({
        where: {
          access: "ACTIVE",
          isActive: true,
          releasedAt: null,
          termEndsAt: { lte: now },
        },
      });
      for (const slot of due) {
        try {
          await this.prisma.subscriptionSlot.update({
            where: { id: slot.id },
            data: { access: "BLOCKED", blockedAt: now },
          });
          blocked += 1;
          await this.notifications?.notifySeatChange({
            userId: slot.userId,
            slotId: slot.id,
            subscriptionId: slot.subscriptionId,
            action: "blocked",
          });
        } catch (error) {
          logger.error({ err: error, slotId: slot.id }, "Seat block failed");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Seat block sweep failed");
    }
    const releasedBlocked = await this.releaseMatching(
      {
        access: "BLOCKED",
        isActive: true,
        releasedAt: null,
        blockedAt: { lte: graceBefore },
      },
      "freed"
    );
    try {
      await this.notifications?.warnExpiries(now);
    } catch (error) {
      logger.error({ err: error }, "Expiry notice sweep failed");
    }
    return { releasedHolds, blocked, releasedBlocked };
  }

  private async releaseMatching(
    where: Prisma.SubscriptionSlotWhereInput,
    action: "freed"
  ): Promise<number> {
    let released = 0;
    try {
      const slots = await this.prisma.subscriptionSlot.findMany({
        where,
        include: { subscription: { select: { serviceProviderId: true, countryId: true } } },
      });
      for (const slot of slots) {
        try {
          await this.prisma.subscriptionSlot.update({
            where: { id: slot.id },
            data: { isActive: false, releasedAt: new Date() },
          });
          released += 1;
          await this.notifications?.notifySeatChange({
            userId: slot.userId,
            slotId: slot.id,
            subscriptionId: slot.subscriptionId,
            action,
          });
          await this.processPending(
            slot.subscription.serviceProviderId,
            slot.subscription.countryId
          );
        } catch (error) {
          logger.error({ err: error, slotId: slot.id }, "Seat release failed");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Seat release sweep failed");
    }
    return released;
  }

  private async allocate(
    tx: Prisma.TransactionClient,
    userId: string,
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<{
    success: boolean;
    slotAssignment?: ISubscriptionSlot;
    message: string;
  }> {
    const existing = await tx.subscriptionSlot.findFirst({
      where: {
        userId,
        isActive: true,
        releasedAt: null,
        subscription: { serviceProviderId },
      },
    });
    if (existing) {
      return {
        success: false,
        message: "You already have a slot assigned for this service provider",
      };
    }

    const rows = await tx.$queryRaw<SlotCandidate[]>`
      SELECT s.id,
             s."maxSlots" AS "maxSlots",
             (
               SELECT COUNT(*)::int
               FROM "subscription_slots" sl
               WHERE sl."subscriptionId" = s.id
                 AND sl."isActive" = true
                 AND sl."releasedAt" IS NULL
             ) AS occupied
      FROM "subscriptions" s
      WHERE s."serviceProviderId" = ${serviceProviderId}
        AND s."isActive" = true
        AND s."needsCredentialReset" = false
        AND (s."expiresAt" IS NULL OR s."expiresAt" > NOW())
        AND (${countryId ?? null}::text IS NULL OR s."countryId" = ${countryId ?? null})
      ORDER BY occupied DESC, s."createdAt" ASC
      FOR UPDATE OF s
    `;

    const target = selectSubscriptionForAllocation(
      rows.map((row) => ({
        id: row.id,
        maxSlots: Number(row.maxSlots),
        occupied: Number(row.occupied),
      }))
    );
    if (!target) {
      return {
        success: false,
        message: "No available slots found",
      };
    }

    const created = await tx.subscriptionSlot.create({
      data: {
        userId,
        subscriptionId: target.id,
        access: "AWAITING_PAYMENT",
        aliasLocalPart: `tmp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const named = await tx.subscriptionSlot.update({
      where: { id: created.id },
      data: { aliasLocalPart: `seat${created.id}` },
      include: { subscription: { include: { country: true } } },
    });

    return {
      success: true,
      slotAssignment: {
        id: named.id,
        userId: named.userId,
        subscriptionId: named.subscriptionId,
        assignedAt: named.assignedAt,
        isActive: named.isActive,
        releasedAt: named.releasedAt,
        access: named.access,
        termStartsAt: named.termStartsAt,
        termEndsAt: named.termEndsAt,
        blockedAt: named.blockedAt,
        aliasLocalPart: named.aliasLocalPart,
        createdAt: named.createdAt,
        updatedAt: named.updatedAt,
      },
      message: "Slot successfully assigned",
    };
  }

  private async refreshCapacity(serviceProviderId: string): Promise<void> {
    if (!this.capacityForecast) {
      return;
    }
    try {
      await this.capacityForecast.recomputeProvider(serviceProviderId);
    } catch (error) {
      logger.error(
        { err: error, serviceProviderId },
        "Capacity forecast recompute failed"
      );
    }
  }
}
