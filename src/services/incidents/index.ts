import { IncidentStatus, PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../../utils/errors";

export interface IncidentView {
  id: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  note: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt: string | null;
}

function toView(row: {
  id: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  note: string;
  status: IncidentStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}): IncidentView {
  return {
    id: row.id,
    slotId: row.slotId,
    userId: row.userId,
    subscriptionId: row.subscriptionId,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export class IncidentService {
  constructor(private prisma: PrismaClient) {}

  async report(slotId: string, userId: string, note: string): Promise<IncidentView> {
    const slot = await this.prisma.subscriptionSlot.findUnique({ where: { id: slotId } });
    if (!slot || !slot.isActive || slot.releasedAt) {
      throw new NotFoundError("Slot not found");
    }
    if (slot.userId !== userId) {
      throw new ForbiddenError("You cannot report this slot");
    }
    const created = await this.prisma.loginIncident.create({
      data: {
        slotId,
        userId,
        subscriptionId: slot.subscriptionId,
        note: note.trim(),
      },
    });
    return toView(created);
  }

  async list(subscriptionId?: string): Promise<IncidentView[]> {
    const rows = await this.prisma.loginIncident.findMany({
      where: subscriptionId ? { subscriptionId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toView);
  }

  async resolve(incidentId: string): Promise<IncidentView> {
    const existing = await this.prisma.loginIncident.findUnique({
      where: { id: incidentId },
    });
    if (!existing) {
      throw new NotFoundError("Incident not found");
    }
    if (existing.status === "RESOLVED") {
      return toView(existing);
    }
    const updated = await this.prisma.loginIncident.update({
      where: { id: incidentId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return toView(updated);
  }
}
