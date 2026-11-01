import { Prisma, PrismaClient } from "@prisma/client";
import {
  ihellaChargeIsOpen,
  isSamePaymentChoice,
  paymentWaitsForAdmin,
  waitsForAdminWhere,
} from "../../../src/services/payments/choice";
import { SlotAssignmentService } from "../../../src/services/subscriptions/slotAssignmentService";

describe("payment choice", () => {
  it("treats another manual start as the same choice", () => {
    expect(
      isSamePaymentChoice(
        { verification: "MANUAL", method: null },
        { verification: "MANUAL", method: "LUMICASH" }
      )
    ).toBe(true);
  });

  it("treats a different gateway as a different choice", () => {
    expect(
      isSamePaymentChoice(
        { verification: "ONLINE", method: "LUMICASH" },
        { verification: "ONLINE", method: "ENOTI" }
      )
    ).toBe(false);
    expect(
      isSamePaymentChoice(
        { verification: "ONLINE", method: "LUMICASH" },
        { verification: "MANUAL", method: "LUMICASH" }
      )
    ).toBe(false);
  });

  it("keeps an open Ihella charge from being replaced", () => {
    expect(
      ihellaChargeIsOpen({
        verification: "ONLINE",
        method: "IHELLA",
        providerRef: "ref",
      })
    ).toBe(true);
    expect(
      ihellaChargeIsOpen({
        verification: "MANUAL",
        method: "IHELLA",
        providerRef: "ref",
      })
    ).toBe(false);
    expect(
      ihellaChargeIsOpen({
        verification: "ONLINE",
        method: "IHELLA",
        providerRef: null,
      })
    ).toBe(false);
  });

  it("asks an admin to confirm manual payments and gateway payments that cannot confirm themselves", () => {
    expect(
      paymentWaitsForAdmin({
        verification: "MANUAL",
        method: null,
        status: "PENDING",
        providerRef: null,
      })
    ).toBe(true);
    expect(
      paymentWaitsForAdmin({
        verification: "ONLINE",
        method: "LUMICASH",
        status: "PENDING",
        providerRef: null,
      })
    ).toBe(true);
    expect(
      paymentWaitsForAdmin({
        verification: "ONLINE",
        method: "ENOTI",
        status: "PENDING",
        providerRef: null,
      })
    ).toBe(true);
    expect(
      paymentWaitsForAdmin({
        verification: "ONLINE",
        method: "IHELLA",
        status: "PENDING",
        providerRef: null,
      })
    ).toBe(true);
    expect(
      paymentWaitsForAdmin({
        verification: "ONLINE",
        method: "IHELLA",
        status: "PENDING",
        providerRef: "ref",
      })
    ).toBe(false);
    expect(
      paymentWaitsForAdmin({
        verification: "MANUAL",
        method: null,
        status: "PAID",
        providerRef: null,
      })
    ).toBe(false);
  });
});

describe("sweepSeatTerms", () => {
  function serviceWith(findMany: jest.Mock): SlotAssignmentService {
    const prisma = {
      subscriptionSlot: {
        findMany,
        update: jest.fn().mockResolvedValue({}),
      },
      subscriptionRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;
    return new SlotAssignmentService(prisma);
  }

  it("leaves a seat that is waiting on an admin out of the release query", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await serviceWith(findMany).sweepSeatTerms();

    const awaiting = findMany.mock.calls[0][0] as {
      where: Prisma.SubscriptionSlotWhereInput;
    };
    const blocked = findMany.mock.calls[2][0] as {
      where: Prisma.SubscriptionSlotWhereInput;
    };
    expect(awaiting.where.access).toBe("AWAITING_PAYMENT");
    expect(awaiting.where.payments).toEqual({ none: waitsForAdminWhere() });
    expect(blocked.where.access).toBe("BLOCKED");
    expect(blocked.where.payments).toEqual({ none: waitsForAdminWhere() });
  });

  it("frees a held seat that has no payment waiting on an admin", async () => {
    const update = jest.fn().mockResolvedValue({});
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: "slot",
          userId: "user",
          subscriptionId: "sub",
          subscription: { serviceProviderId: "provider", countryId: "country" },
        },
      ])
      .mockResolvedValue([]);
    const prisma = {
      subscriptionSlot: { findMany, update },
      subscriptionRequest: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const released = await new SlotAssignmentService(prisma).sweepSeatTerms();

    expect(released.releasedHolds).toBe(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "slot" },
      data: { isActive: false, releasedAt: expect.any(Date) },
    });
  });
});
