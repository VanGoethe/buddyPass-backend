import { PaymentMethod, PaymentVerification } from "@prisma/client";
import { PaymentService } from "../../../src/services/payments";
import { SeatHandoff } from "../../../src/services/payments/afterConfirmation";
import { INotificationPublisher, SeatReadyPush } from "../../../src/realtime";
import { INotificationService } from "../../../src/services/notifications";

function paymentRow(input: {
  verification: PaymentVerification;
  method: PaymentMethod | null;
  status?: "PENDING" | "PAID" | "FAILED";
  released?: boolean;
  access?: "AWAITING_PAYMENT" | "ACTIVE" | "BLOCKED";
}) {
  return {
    id: "pay-1",
    userId: "user-1",
    slotId: "slot-1",
    subscriptionId: "sub-1",
    amount: { toString: () => "25000" },
    currencyId: "cur-1",
    verification: input.verification,
    method: input.method,
    confirmationNote: null,
    status: input.status ?? "PENDING",
    providerRef: input.method === "IHELLA" ? "ihella-ref" : null,
    paidAt: null as Date | null,
    settledAfterRelease: false,
    createdAt: new Date("2026-11-01T10:00:00.000Z"),
    slot: {
      id: "slot-1",
      isActive: !input.released,
      releasedAt: input.released ? new Date("2026-11-01T09:00:00.000Z") : null,
      access: input.access ?? "AWAITING_PAYMENT",
      termStartsAt: null,
      termEndsAt: null,
    },
  };
}

function harness(row: ReturnType<typeof paymentRow>, handoff: { afterPaid: jest.Mock }) {
  const tx = {
    payment: {
      findUnique: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        ...row,
        ...data,
      })),
    },
    subscriptionSlot: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    payment: {
      findUnique: jest.fn().mockResolvedValue(row),
    },
    subscriptionSlot: {
      findUnique: jest.fn().mockResolvedValue({
        termEndsAt: new Date("2026-12-01T10:00:00.000Z"),
        subscription: { serviceProvider: { name: "Netflix" } },
      }),
    },
  };
  const notifications = {
    notifySeatChange: jest.fn(),
    notifyPaymentConfirmed: jest.fn(),
  };
  const service = new PaymentService(
    prisma as unknown as ConstructorParameters<typeof PaymentService>[0],
    notifications as unknown as INotificationService,
    null,
    handoff
  );
  return { service, notifications };
}

describe("seat handoff", () => {
  const cases: Array<{
    name: string;
    verification: PaymentVerification;
    method: PaymentMethod | null;
    throughRef?: boolean;
  }> = [
    { name: "manual", verification: "MANUAL", method: null },
    { name: "Lumicash", verification: "ONLINE", method: "LUMICASH" },
    { name: "eNoti", verification: "ONLINE", method: "ENOTI" },
    { name: "Ihella", verification: "ONLINE", method: "IHELLA", throughRef: true },
  ];

  it.each(cases)("runs once after $name confirmation", async ({ verification, method, throughRef }) => {
    const handoff = { afterPaid: jest.fn().mockResolvedValue(undefined) };
    const row = paymentRow({ verification, method });
    const { service } = harness(row, handoff);
    if (throughRef) {
      await service.confirmByProviderRef("ihella-ref");
    } else {
      await service.confirm(row.id);
    }
    expect(handoff.afterPaid).toHaveBeenCalledTimes(1);
    expect(handoff.afterPaid).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: row.id,
        slotId: row.slotId,
        userId: row.userId,
        subscriptionId: row.subscriptionId,
        renewed: false,
      })
    );
  });

  it("does not run for an already-paid payment", async () => {
    const handoff = { afterPaid: jest.fn() };
    const { service } = harness(
      paymentRow({ verification: "MANUAL", method: null, status: "PAID" }),
      handoff
    );
    await service.confirm("pay-1");
    expect(handoff.afterPaid).not.toHaveBeenCalled();
  });

  it("does not run when a released manual payment is rejected", async () => {
    const handoff = { afterPaid: jest.fn() };
    const { service } = harness(
      paymentRow({ verification: "MANUAL", method: null, released: true }),
      handoff
    );
    await expect(service.confirm("pay-1")).rejects.toMatchObject({ code: "SEAT_RELEASED" });
    expect(handoff.afterPaid).not.toHaveBeenCalled();
  });

  it("does not run for a payment that settles after the seat was released", async () => {
    const handoff = { afterPaid: jest.fn() };
    const { service } = harness(
      paymentRow({ verification: "ONLINE", method: "LUMICASH", released: true }),
      handoff
    );
    await service.confirm("pay-1");
    expect(handoff.afterPaid).not.toHaveBeenCalled();
  });

  it("still confirms when the handoff throws", async () => {
    const handoff = { afterPaid: jest.fn().mockRejectedValue(new Error("push failed")) };
    const { service } = harness(
      paymentRow({ verification: "MANUAL", method: null }),
      handoff
    );
    const view = await service.confirm("pay-1");
    expect(view.status).toBe("PAID");
    expect(view.slotId).toBe("slot-1");
  });

  it("pushes seat-ready without the email or the password", async () => {
    const ready: SeatReadyPush[] = [];
    const publisher = {
      publishSeatReady(_userId: string, view: SeatReadyPush) {
        ready.push(view);
      },
    } as INotificationPublisher;
    const prisma = {
      subscriptionSlot: {
        findUnique: jest.fn().mockResolvedValue({
          termEndsAt: new Date("2026-12-01T10:00:00.000Z"),
          subscription: {
            email: "you+netflix1@gmail.com",
            passwordCiphertext: "cipher",
            serviceProvider: { name: "Netflix" },
          },
        }),
      },
    };
    const handoff = new SeatHandoff(
      prisma as unknown as ConstructorParameters<typeof SeatHandoff>[0],
      publisher
    );
    await handoff.afterPaid({
      paymentId: "pay-1",
      slotId: "slot-1",
      userId: "user-1",
      subscriptionId: "sub-1",
      renewed: false,
    });
    expect(ready).toEqual([
      {
        slotId: "slot-1",
        subscriptionId: "sub-1",
        serviceName: "Netflix",
        termEndsAt: "2026-12-01T10:00:00.000Z",
        renewed: false,
      },
    ]);
    expect(JSON.stringify(ready[0])).not.toMatch(/email|password|cipher/i);
  });
});
