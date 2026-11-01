import {
  PaymentMethod,
  PaymentStatus,
  PaymentVerification,
  Prisma,
  PrismaClient,
  SlotAccess,
} from "@prisma/client";
import { INotificationService } from "../notifications";
import { ISeatHandoff } from "./afterConfirmation";
import { IIhellaClient } from "./ihellaClient";
import {
  ihellaChargeIsOpen,
  isSamePaymentChoice,
  paymentWaitsForAdmin,
  waitsForAdminWhere,
} from "./choice";
import { nextCustomerTerm } from "../../utils/termDates";
import { env } from "../../config/env";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export interface PaymentView {
  id: string;
  userId: string;
  slotId: string;
  subscriptionId: string;
  amount: string;
  currencyId: string;
  verification: PaymentVerification;
  method: PaymentMethod | null;
  confirmationNote: string | null;
  status: PaymentStatus;
  providerRef: string | null;
  paidAt: string | null;
  settledAfterRelease: boolean;
  createdAt: string;
}

export interface AwaitingPaymentView {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  slotId: string;
  subscriptionId: string;
  serviceName: string;
  amount: string;
  currencyCode: string;
  verification: PaymentVerification;
  method: PaymentMethod | null;
  confirmationNote: string | null;
  access: SlotAccess;
  holdEndsAt: string | null;
  createdAt: string;
}

export interface StartPaymentInput {
  verification: PaymentVerification;
  method: PaymentMethod | null;
  confirmationNote: string | null;
}

export interface PaymentListFilter {
  verification?: PaymentVerification;
  status?: PaymentStatus;
}

export interface IPaymentAdminSummary {
  countAwaitingAdmin(): Promise<number>;
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
  verification: PaymentVerification;
  method: PaymentMethod | null;
  confirmationNote: string | null;
  status: PaymentStatus;
  providerRef: string | null;
  paidAt: Date | null;
  settledAfterRelease: boolean;
  createdAt: Date;
}

const paymentContext = {
  user: { select: { name: true, email: true } },
  subscription: {
    include: {
      currency: { select: { code: true } },
      serviceProvider: { select: { name: true } },
    },
  },
} as const;

type PaymentWithContext = PaymentRow & {
  user: { name: string | null; email: string };
  subscription: {
    currency: { code: string } | null;
    serviceProvider: { name: string };
  };
};

function toView(row: PaymentRow): PaymentView {
  return {
    id: row.id,
    userId: row.userId,
    slotId: row.slotId,
    subscriptionId: row.subscriptionId,
    amount: row.amount.toString(),
    currencyId: row.currencyId,
    verification: row.verification,
    method: row.method,
    confirmationNote: row.confirmationNote,
    status: row.status,
    providerRef: row.providerRef,
    paidAt: row.paidAt?.toISOString() ?? null,
    settledAfterRelease: row.settledAfterRelease,
    createdAt: row.createdAt.toISOString(),
  };
}

function holdEndsAt(slot: {
  access: SlotAccess;
  assignedAt: Date;
  blockedAt: Date | null;
}): string | null {
  if (slot.access === "AWAITING_PAYMENT") {
    return new Date(
      slot.assignedAt.getTime() + env.SEAT_PAYMENT_HOLD_HOURS * 60 * 60 * 1000
    ).toISOString();
  }
  if (slot.access === "BLOCKED" && slot.blockedAt) {
    return new Date(
      slot.blockedAt.getTime() + env.SEAT_BLOCK_GRACE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
  }
  return null;
}

function verifyCopy(
  payment: PaymentWithContext,
  reason: "started" | "note"
): { subject: string; body: string } {
  const who = payment.user.name
    ? `${payment.user.name} (${payment.user.email})`
    : payment.user.email;
  const service = payment.subscription.serviceProvider.name;
  const amount = `${payment.amount.toString()} ${payment.subscription.currency?.code ?? ""}`.trim();
  const path = payment.verification === "MANUAL" ? "manual verification" : "an online payment";
  const method = payment.method ? ` via ${payment.method}` : "";
  const note = payment.confirmationNote ? ` Confirmation: ${payment.confirmationNote}.` : "";
  if (reason === "note") {
    return {
      subject: "Payment confirmation received",
      body: `${who} sent payment confirmation for ${service} (${amount}).${note}`,
    };
  }
  return {
    subject: "Payment to verify",
    body: `${who} chose ${path}${method} for ${service} (${amount}).${note}`,
  };
}

export class PaymentService implements ISeatAccess, IPaymentAdminSummary {
  constructor(
    private prisma: PrismaClient,
    private notifications: INotificationService,
    private ihella: IIhellaClient | null,
    private handoff: ISeatHandoff | null = null
  ) {}

  async createForSlot(
    slotId: string,
    userId: string,
    input: StartPaymentInput
  ): Promise<PaymentView> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { id: slotId },
      include: { subscription: { select: { userPrice: true, currencyId: true } } },
    });
    if (!slot || !slot.isActive || slot.releasedAt) {
      throw new NotFoundError("Slot not found");
    }
    if (slot.userId !== userId) {
      throw new ForbiddenError("You cannot pay for this slot");
    }
    const amount = slot.subscription.userPrice;
    const currencyId = slot.subscription.currencyId;
    if (amount === null || !currencyId) {
      throw new ConflictError("This account has no seat price", "PRICE_UNAVAILABLE");
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const pending = await tx.payment.findFirst({
        where: { slotId, status: "PENDING" },
      });
      if (pending && isSamePaymentChoice(pending, input)) {
        return { paymentId: pending.id, notify: false };
      }
      if (pending && ihellaChargeIsOpen(pending)) {
        throw new ConflictError(
          "An Ihella charge is already open for this seat",
          "IHELLA_CHARGE_OPEN"
        );
      }
      if (pending) {
        await tx.payment.update({
          where: { id: pending.id },
          data: { status: "FAILED" },
        });
      }
      const created = await tx.payment.create({
        data: {
          userId,
          slotId,
          subscriptionId: slot.subscriptionId,
          amount,
          currencyId,
          verification: input.verification,
          method: input.method,
          confirmationNote:
            input.verification === "MANUAL" ? input.confirmationNote : null,
        },
      });
      return { paymentId: created.id, notify: true };
    });

    let payment = await this.loadPayment(outcome.paymentId);
    if (!outcome.notify) {
      return toView(payment);
    }

    if (payment.verification === "ONLINE" && payment.method === "IHELLA" && this.ihella) {
      try {
        const charge = await this.ihella.createCharge({
          paymentId: payment.id,
          amount: payment.amount.toString(),
          currencyCode: payment.subscription.currency?.code ?? "",
          slotId,
        });
        payment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: { providerRef: charge.providerRef },
          include: paymentContext,
        });
      } catch (error) {
        logger.error({ err: error, paymentId: payment.id }, "Ihella charge was not created");
      }
    }

    if (paymentWaitsForAdmin(payment)) {
      const copy = verifyCopy(payment, "started");
      await this.notifications.notifyAdminsAboutPayment({
        body: copy.body,
        subject: copy.subject,
        dedupePrefix: "payment",
        paymentId: payment.id,
        slotId: payment.slotId,
        subscriptionId: payment.subscriptionId,
      });
    }
    return toView(payment);
  }

  async setConfirmationNote(
    paymentId: string,
    userId: string,
    confirmationNote: string
  ): Promise<PaymentView> {
    const payment = await this.loadPayment(paymentId);
    if (payment.userId !== userId) {
      throw new ForbiddenError("You cannot update this payment");
    }
    if (payment.status !== "PENDING" || payment.verification !== "MANUAL") {
      throw new ConflictError(
        "Only a pending manual payment can take a confirmation note",
        "NOTE_NOT_ALLOWED"
      );
    }
    const firstNote = payment.confirmationNote === null || payment.confirmationNote.length === 0;
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { confirmationNote },
      include: paymentContext,
    });
    if (firstNote) {
      const copy = verifyCopy(updated, "note");
      await this.notifications.notifyAdminsAboutPayment({
        body: copy.body,
        subject: copy.subject,
        dedupePrefix: "payment-note",
        paymentId: updated.id,
        slotId: updated.slotId,
        subscriptionId: updated.subscriptionId,
      });
    }
    return toView(updated);
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
        return { payment, renewed: false, notify: false, seatActivated: false };
      }
      if (payment.status === "FAILED") {
        throw new ConflictError("This payment has already failed", "PAYMENT_FAILED");
      }

      const paidAt = new Date();
      const released = !payment.slot.isActive || payment.slot.releasedAt !== null;
      if (released && payment.verification === "MANUAL") {
        throw new ConflictError("This seat is no longer held", "SEAT_RELEASED");
      }
      if (released) {
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", paidAt, settledAfterRelease: true },
        });
        return { payment: updated, renewed: false, notify: true, seatActivated: false };
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
      return { payment: updated, renewed, notify: true, seatActivated: true };
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
    if (outcome.seatActivated && this.handoff) {
      try {
        await this.handoff.afterPaid({
          paymentId: outcome.payment.id,
          slotId: outcome.payment.slotId,
          userId: outcome.payment.userId,
          subscriptionId: outcome.payment.subscriptionId,
          renewed: outcome.renewed,
        });
      } catch (error) {
        logger.error(
          { err: error, paymentId: outcome.payment.id, slotId: outcome.payment.slotId },
          "Seat handoff failed"
        );
      }
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
    await this.notifications.notifyPaymentRejected({
      userId: updated.userId,
      slotId: updated.slotId,
      subscriptionId: updated.subscriptionId,
      paymentId: updated.id,
    });
    return toView(updated);
  }

  async list(filter: PaymentListFilter = {}): Promise<PaymentView[]> {
    const rows = await this.prisma.payment.findMany({
      where: {
        ...(filter.verification ? { verification: filter.verification } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toView);
  }

  async listAwaitingAdmin(): Promise<AwaitingPaymentView[]> {
    const rows = await this.prisma.payment.findMany({
      where: waitsForAdminWhere(),
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        slot: { select: { access: true, assignedAt: true, blockedAt: true } },
        subscription: {
          include: {
            currency: { select: { code: true } },
            serviceProvider: { select: { name: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      slotId: row.slotId,
      subscriptionId: row.subscriptionId,
      serviceName: row.subscription.serviceProvider.name,
      amount: row.amount.toString(),
      currencyCode: row.subscription.currency?.code ?? "",
      verification: row.verification,
      method: row.method,
      confirmationNote: row.confirmationNote,
      access: row.slot.access,
      holdEndsAt: holdEndsAt(row.slot),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async countAwaitingAdmin(): Promise<number> {
    return this.prisma.payment.count({ where: waitsForAdminWhere() });
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

  private async loadPayment(paymentId: string): Promise<PaymentWithContext> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentContext,
    });
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }
    return payment;
  }
}
