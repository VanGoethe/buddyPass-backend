import { Prisma, PrismaClient } from "@prisma/client";
import {
  ISlotAssignmentService,
  ISubscriptionSlot,
  selectSubscriptionForAllocation,
  SlotCandidate,
} from "../../types/subscriptions";
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
  constructor(private prisma: PrismaClient) {}

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
        return await this.prisma.$transaction(
          (tx) => this.allocate(tx, userId, serviceProviderId, countryId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
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
    return assigned;
  }

  async releaseExpiredSlots(): Promise<number> {
    const expired = await this.prisma.subscription.findMany({
      where: {
        expiresAt: { lte: new Date() },
        subscriptionSlots: { some: { isActive: true, releasedAt: null } },
      },
      select: {
        id: true,
        serviceProviderId: true,
        countryId: true,
        subscriptionSlots: {
          where: { isActive: true, releasedAt: null },
          select: { id: true },
        },
      },
    });

    let released = 0;
    for (const subscription of expired) {
      for (const slot of subscription.subscriptionSlots) {
        await this.prisma.subscriptionSlot.update({
          where: { id: slot.id },
          data: { isActive: false, releasedAt: new Date() },
        });
        released += 1;
      }
      await this.processPending(
        subscription.serviceProviderId,
        subscription.countryId
      );
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
      data: { userId, subscriptionId: target.id },
      include: { subscription: { include: { country: true } } },
    });

    return {
      success: true,
      slotAssignment: {
        id: created.id,
        userId: created.userId,
        subscriptionId: created.subscriptionId,
        assignedAt: created.assignedAt,
        isActive: created.isActive,
        releasedAt: created.releasedAt,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      message: "Slot successfully assigned",
    };
  }
}
