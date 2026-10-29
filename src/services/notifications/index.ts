import { NotificationKind, NotificationStage, Prisma, PrismaClient, UserRole } from "@prisma/client";
import { IMailer } from "../mail/smtpMailer";
import { ForbiddenError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NotificationView {
  id: string;
  recipientUserId: string;
  kind: NotificationKind;
  body: string;
  subscriptionId: string | null;
  slotId: string | null;
  paymentId: string | null;
  stage: NotificationStage;
  readAt: string | null;
  createdAt: string;
}

export interface INotificationService {
  notifySeatChange(input: {
    userId: string;
    slotId: string;
    subscriptionId: string;
    action: "assigned" | "blocked" | "freed" | "renewed";
  }): Promise<void>;
  notifyPaymentConfirmed(input: {
    userId: string;
    slotId: string;
    subscriptionId: string;
    paymentId: string;
  }): Promise<void>;
  warnExpiries(now: Date): Promise<void>;
  listForRecipient(userId: string): Promise<NotificationView[]>;
  listAll(): Promise<NotificationView[]>;
  markRead(
    id: string,
    actor: { id: string; role: UserRole }
  ): Promise<NotificationView>;
}

interface NoticeInput {
  recipientUserId: string;
  kind: NotificationKind;
  body: string;
  subscriptionId?: string;
  slotId?: string;
  paymentId?: string;
  stage?: NotificationStage;
  dedupeKey?: string;
}

function toView(row: {
  id: string;
  recipientUserId: string;
  kind: NotificationKind;
  body: string;
  subscriptionId: string | null;
  slotId: string | null;
  paymentId: string | null;
  stage: NotificationStage;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    kind: row.kind,
    body: row.body,
    subscriptionId: row.subscriptionId,
    slotId: row.slotId,
    paymentId: row.paymentId,
    stage: row.stage,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const SEAT_COPY: Record<"assigned" | "blocked" | "freed" | "renewed", string> = {
  assigned: "Your seat was assigned. Pay to receive the login.",
  blocked: "Your seat is blocked because the paid month ended.",
  freed: "Your seat was freed.",
  renewed: "Your seat was renewed.",
};

export class NotificationService implements INotificationService {
  constructor(
    private prisma: PrismaClient,
    private mailer: IMailer
  ) {}

  async notifySeatChange(input: {
    userId: string;
    slotId: string;
    subscriptionId: string;
    action: "assigned" | "blocked" | "freed" | "renewed";
  }): Promise<void> {
    await this.write({
      recipientUserId: input.userId,
      kind: "SEAT_CHANGE",
      body: SEAT_COPY[input.action],
      slotId: input.slotId,
      subscriptionId: input.subscriptionId,
    });
  }

  async notifyPaymentConfirmed(input: {
    userId: string;
    slotId: string;
    subscriptionId: string;
    paymentId: string;
  }): Promise<void> {
    await this.write({
      recipientUserId: input.userId,
      kind: "PAYMENT_CONFIRMATION",
      body: "Your payment is confirmed.",
      slotId: input.slotId,
      subscriptionId: input.subscriptionId,
      paymentId: input.paymentId,
    });
  }

  async warnExpiries(now: Date): Promise<void> {
    const weekEnd = new Date(now.getTime() + WEEK_MS);
    const dayEnd = new Date(now.getTime() + DAY_MS);
    await this.warnProviders(now, weekEnd, dayEnd);
    await this.warnSeats(now, weekEnd, dayEnd);
  }

  async listForRecipient(userId: string): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toView);
  }

  async listAll(): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toView);
  }

  async markRead(
    id: string,
    actor: { id: string; role: UserRole }
  ): Promise<NotificationView> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError("Notification not found");
    }
    if (actor.role !== UserRole.ADMIN && row.recipientUserId !== actor.id) {
      throw new ForbiddenError("You cannot update this notification");
    }
    if (row.readAt) {
      return toView(row);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return toView(updated);
  }

  private async warnProviders(now: Date, weekEnd: Date, dayEnd: Date): Promise<void> {
    const [subscriptions, admins] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { isActive: true, expiresAt: { gt: now, lte: weekEnd } },
        include: { serviceProvider: { select: { name: true } } },
      }),
      this.prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      }),
    ]);
    for (const subscription of subscriptions) {
      if (!subscription.expiresAt) {
        continue;
      }
      const stage: NotificationStage =
        subscription.expiresAt.getTime() <= dayEnd.getTime() ? "DAY" : "WEEK";
      const when = stage === "DAY" ? "within a day" : "within a week";
      const body = `${subscription.serviceProvider.name} account "${subscription.name}" must be renewed with the provider ${when}.`;
      for (const admin of admins) {
        await this.write({
          recipientUserId: admin.id,
          kind: "PROVIDER_EXPIRY",
          body,
          subscriptionId: subscription.id,
          stage,
          dedupeKey: `provider:${admin.id}:${subscription.id}:${stage}`,
        });
      }
    }
  }

  private async warnSeats(now: Date, weekEnd: Date, dayEnd: Date): Promise<void> {
    const slots = await this.prisma.subscriptionSlot.findMany({
      where: {
        isActive: true,
        releasedAt: null,
        access: "ACTIVE",
        termEndsAt: { gt: now, lte: weekEnd },
      },
      include: { subscription: { include: { serviceProvider: { select: { name: true } } } } },
    });
    for (const slot of slots) {
      if (!slot.termEndsAt) {
        continue;
      }
      const stage: NotificationStage =
        slot.termEndsAt.getTime() <= dayEnd.getTime() ? "DAY" : "WEEK";
      const when = stage === "DAY" ? "within a day" : "within a week";
      await this.write({
        recipientUserId: slot.userId,
        kind: "SEAT_EXPIRY",
        body: `Your ${slot.subscription.serviceProvider.name} seat ends ${when}.`,
        subscriptionId: slot.subscriptionId,
        slotId: slot.id,
        stage,
        dedupeKey: `seat:${slot.userId}:${slot.id}:${stage}`,
      });
    }
  }

  private async write(input: NoticeInput): Promise<void> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          kind: input.kind,
          body: input.body,
          subscriptionId: input.subscriptionId,
          slotId: input.slotId,
          paymentId: input.paymentId,
          stage: input.stage ?? "NONE",
          dedupeKey: input.dedupeKey,
        },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: input.recipientUserId },
        select: { email: true },
      });
      if (user) {
        await this.mailer.send(user.email, "BuddyPass", input.body);
      }
      void row;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return;
      }
      logger.error({ err: error, kind: input.kind }, "Notice write failed");
    }
  }
}
