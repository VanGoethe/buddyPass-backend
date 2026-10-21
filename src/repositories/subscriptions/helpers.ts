import { Prisma } from "@prisma/client";

export function toInputJson(
  value: Prisma.JsonValue | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export const subscriptionInclude = {
  country: true,
  _count: {
    select: {
      subscriptionSlots: {
        where: { isActive: true, releasedAt: null },
      },
    },
  },
} satisfies Prisma.SubscriptionInclude;
