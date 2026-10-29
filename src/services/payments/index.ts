import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  SlotAccess,
} from "@prisma/client";
import { INotificationService } from "../notifications";
import { IIhellaClient } from "./ihellaClient";
import { nextCustomerTerm } from "../../utils/termDates";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export interface PaymentView {
  id: string;
  userId: string;
  slotId: string;
  subscriptionId: string;
  amount: string;
  currencyId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerRef: string | null;
  paidAt: string | null;
  settledAfterRelease: boolean;
  createdAt: string;
}

export interface SeatAccessSlot {
  id: string;
  access: SlotAccess;
  termStartsAt?: Date | null;
  termEndsAt?: Date | null;
}

export interface ISeatAccess {
  customerCanUseSeat(slot: SeatAccessSlot): Promise<boolean>;
}

interface PaymentRow {
  id: string;
  userId: string;
  slotId: string;
  subscriptionId: string;
  amount: Prisma.Decimal;
  currencyId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerRef: string | null;
  paidAt: Date | null;
  settledAfterRelease: boolean;
  createdAt: Date;
}

function toView(row: PaymentRow): PaymentView {
  return {
    id: row.id,
    userId: row.userId,
    slotId: row.slotId,
    subscriptionId: row.subscriptionId,
    amount: row.amount.toString(),
    currencyId: row.currencyId,
    method: row.method,
    status: row.status,
    providerRef: row.providerRef,
    paidAt: row.paidAt?.toISOString() ?? null,
    settledAfterRelease: row.settledAfterRelease,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PaymentService implements ISeatAccess {
  constructor(
    private prisma: PrismaClient,
    private notifications: INotificationService,
    private ihella: IIhellaClient | null
  ) {}

  async createForSlot(
    slotId: string,
    userId: string,
    method: PaymentMethod
  ): Promise<PaymentView> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { id: slotId },
      include: {
        subscription: { include: { currency: true } },
      },
    });
    if (!slot || !slot.isActive || slot.releasedAt) {
      throw new NotFoundError("Slot not found");
    }
    if (slot.userId !== userId) {
      throw new ForbiddenError("You cannot pay for this slot");
    }
    const pending = await this.prisma.payment.findFirst({
      where: { slotId, status: "PENDING" },
    });
    if (pending) {
      return toView(pending);
    }
    if (slot.subscription.userPrice === null || !slot.subscription.currencyId) {
      throw new ConflictError(
        "This account has no seat price",
        "PRICE_UNAVAILABLE"
      );
    }

    const created = await this.prisma.payment.create({
      data: {
        userId,
        slotId,
        subscriptionId: slot.subscriptionId,
        amount: slot.subscription.userPrice,
        currencyId: slot.subscription.currencyId,
        method,
      },
    });

    if (method === "IHELLA" && this.ihella) {
      try {
        const charge = await this.ihella.createCharge({
          paymentId: created.id,
          amount: created.amount.toString(),
          currencyCode: slot.subscription.currency?.code ?? "",
          slotId,
        });
        const updated = await this.prisma.payment.update({
          where: { id: created.id },
          data: { providerRef: charge.providerRef },
        });
        return toView(updated);
      } catch (error) {
        logger.error({ err: error, paymentId: created.id }, "Ihella charge was not created");
      }
    }

    return toView(created);
  }

  async confirm(paymentId: string): Promise<PaymentView> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { slot: true },
      });
      if (!payment) {
        throw new NotFoundError("Payment not found");
      }
      if (payment.status === "PAID") {
        return { payment, renewed: false, notify: false };
      }
      if (payment.status === "FAILED") {
        throw new ConflictError("This payment has already failed", "PAYMENT_FAILED");
      }

      const paidAt = new Date();
      const released = !payment.slot.isActive || payment.slot.releasedAt !== null;
      if (released) {
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", paidAt, settledAfterRelease: true },
        });
        return { payment: updated, renewed: false, notify: true };
      }

      const renewed = payment.slot.access === "ACTIVE" || payment.slot.access === "BLOCKED";
      const term = nextCustomerTerm(
        payment.slot.access,
        payment.slot.termStartsAt,
        payment.slot.termEndsAt,
        paidAt
      );
      await tx.subscriptionSlot.update({
        where: { id: payment.slotId },
        data: {
          access: "ACTIVE",
          termStartsAt: term.termStartsAt,
          termEndsAt: term.termEndsAt,
          blockedAt: null,
        },
      });
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt, settledAfterRelease: false },
      });
      return { payment: updated, renewed, notify: true };
    });

    if (outcome.notify) {
      if (outcome.renewed) {
        await this.notifications.notifySeatChange({
          userId: outcome.payment.userId,
          slotId: outcome.payment.slotId,
          subscriptionId: outcome.payment.subscriptionId,
          action: "renewed",
        });
      }
      await this.notifications.notifyPaymentConfirmed({
        userId: outcome.payment.userId,
        slotId: outcome.payment.slotId,
        subscriptionId: outcome.payment.subscriptionId,
        paymentId: outcome.payment.id,
      });
    }
    return toView(outcome.payment);
  }

  async confirmByProviderRef(providerRef: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findUnique({ where: { providerRef } });
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return this.confirm(payment.id);
  }

  async fail(paymentId: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    if (payment.status === "PAID") {
      throw new ConflictError("A paid payment cannot be failed", "PAYMENT_ALREADY_PAID");
    }
    if (payment.status === "FAILED") {
      return toView(payment);
    }
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });
    return toView(updated);
  }

  async list(): Promise<PaymentView[]> {
    const rows = await this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toView);
  }

  async customerCanUseSeat(slot: SeatAccessSlot): Promise<boolean> {
    if (slot.access !== "ACTIVE" || !slot.termStartsAt || !slot.termEndsAt) {
      return false;
    }
    if (slot.termEndsAt.getTime() <= Date.now()) {
      return false;
    }
    const paid = await this.prisma.payment.count({
      where: {
        slotId: slot.id,
        status: "PAID",
        settledAfterRelease: false,
        paidAt: { gte: slot.termStartsAt },
      },
    });
    return paid > 0;
  }
}
