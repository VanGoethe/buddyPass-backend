import { Prisma, PrismaClient, SubscriptionRequestStatus } from "@prisma/client";
import {
  CreateSubscriptionRequestData,
  ISubscriptionRequest,
  ISubscriptionRequestRepository,
} from "../../types/subscriptions";
import { SubscriptionRequest } from "../../models/subscriptions";
import { toInputJson } from "./helpers";

const requestInclude = { country: true } as const;

export class PrismaSubscriptionRequestRepository
  implements ISubscriptionRequestRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(
    data: CreateSubscriptionRequestData & {
      userId: string;
      status?: SubscriptionRequestStatus;
      assignedSlotId?: string;
      processedAt?: Date;
    }
  ): Promise<ISubscriptionRequest> {
    const request = await this.prisma.subscriptionRequest.create({
      data: {
        userId: data.userId,
        serviceProviderId: data.serviceProviderId,
        countryId: data.countryId,
        status: data.status,
        assignedSlotId: data.assignedSlotId,
        processedAt: data.processedAt,
      },
      include: requestInclude,
    });
    return SubscriptionRequest.fromPrisma(request);
  }

  async findById(id: string): Promise<ISubscriptionRequest | null> {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    return request ? SubscriptionRequest.fromPrisma(request) : null;
  }

  async findByUserId(userId: string): Promise<ISubscriptionRequest[]> {
    const requests = await this.prisma.subscriptionRequest.findMany({
      where: { userId },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    });
    return requests.map((request) => SubscriptionRequest.fromPrisma(request));
  }

  async findPendingByProviderAndCountry(
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<ISubscriptionRequest[]> {
    const where: Prisma.SubscriptionRequestWhereInput = {
      serviceProviderId,
      status: SubscriptionRequestStatus.PENDING,
    };
    if (countryId) {
      where.countryId = countryId;
    }
    const requests = await this.prisma.subscriptionRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { requestedAt: "asc" },
    });
    return requests.map((request) => SubscriptionRequest.fromPrisma(request));
  }

  async update(
    id: string,
    data: {
      status?: SubscriptionRequestStatus;
      assignedSlotId?: string | null;
      processedAt?: Date;
      metadata?: Prisma.JsonValue;
    }
  ): Promise<ISubscriptionRequest> {
    const request = await this.prisma.subscriptionRequest.update({
      where: { id },
      data: {
        status: data.status,
        assignedSlotId: data.assignedSlotId,
        processedAt: data.processedAt,
        metadata: toInputJson(data.metadata),
      },
      include: requestInclude,
    });
    return SubscriptionRequest.fromPrisma(request);
  }
}
