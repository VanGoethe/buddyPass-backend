import { UserRole } from "@prisma/client";
import { ISeatAccess } from "../payments";
import { IRevealStore } from "../../repositories/reveals";
import { IInboxReader } from "../inbox";
import { IncidentService, IncidentView } from "../incidents";
import { INotificationService } from "../notifications";
import { PublicOffer } from "../../types/subscriptions";
import {
  CreateSubscriptionData,
  CreateSubscriptionRequestData,
  CredentialReveal,
  ISlotAssignmentService,
  ISubscriptionRepository,
  ISubscriptionRequestRepository,
  ISubscriptionService,
  ISubscriptionSlotRepository,
  SubscriptionListResponse,
  SubscriptionQueryOptions,
  SubscriptionRequestResponse,
  SubscriptionRequestStatus,
  SubscriptionResponse,
  SubscriptionSlotResponse,
  UpdateSubscriptionData,
} from "../../types/subscriptions";
import { ICapacityForecastService } from "../../types/capacity";
import { ICountryRepository } from "../../types/countries";
import { IServiceProviderRepository } from "../../types/serviceProviders";
import { Subscription, SubscriptionRequest, SubscriptionSlot } from "../../models/subscriptions";
import { credentialCipher } from "../../utils/credentialCipher";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { logger } from "../../utils/logger";
import { numberByPool } from "./waitingLine";

export class SubscriptionService implements ISubscriptionService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private subscriptionSlotRepository: ISubscriptionSlotRepository,
    private subscriptionRequestRepository: ISubscriptionRequestRepository,
    private serviceProviderRepository: IServiceProviderRepository,
    private countryRepository: ICountryRepository,
    private slotAssignmentService: ISlotAssignmentService,
    private capacityForecast?: ICapacityForecastService,
    private seatAccess?: ISeatAccess,
    private revealStore?: IRevealStore,
    private inbox?: IInboxReader,
    private incidents?: IncidentService,
    private notifications?: INotificationService
  ) {}

  async createSubscription(
    data: CreateSubscriptionData
  ): Promise<SubscriptionResponse> {
    Subscription.validateCreateData(data);
    await this.assertProviderAndCountry(data.serviceProviderId, data.countryId);
    if (await this.subscriptionRepository.existsByEmail(data.email)) {
      throw new ConflictError("A subscription with this email already exists");
    }

    const encrypted = credentialCipher.encrypt(data.password);
    const { password: _password, ...rest } = data;
    const subscription = await this.subscriptionRepository.create({
      ...rest,
      ...encrypted,
      needsCredentialReset: false,
    });

    await this.slotAssignmentService.processPending(
      subscription.serviceProviderId,
      subscription.countryId
    );
    await this.refreshCapacity(subscription.serviceProviderId);
    const refreshed = await this.subscriptionRepository.findById(subscription.id);
    return new Subscription(refreshed ?? subscription).toResponse();
  }

  async getSubscriptionById(id: string): Promise<SubscriptionResponse> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }
    return new Subscription(subscription).toResponse();
  }

  async getSubscriptions(
    options?: SubscriptionQueryOptions
  ): Promise<SubscriptionListResponse> {
    const { subscriptions, total } =
      await this.subscriptionRepository.findMany(options);
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    return {
      subscriptions: subscriptions.map((sub) => new Subscription(sub).toResponse()),
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async updateSubscription(
    id: string,
    data: UpdateSubscriptionData
  ): Promise<SubscriptionResponse> {
    Subscription.validateUpdateData(data);
    const existing = await this.subscriptionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Subscription not found");
    }
    if (data.countryId) {
      await this.assertProviderAndCountry(
        existing.serviceProviderId,
        data.countryId
      );
    }
    if (data.email && (await this.subscriptionRepository.existsByEmail(data.email, id))) {
      throw new ConflictError("A subscription with this email already exists");
    }
    if (data.maxSlots !== undefined) {
      const occupied = existing.occupiedSlots ?? 0;
      if (data.maxSlots < occupied) {
        throw new ValidationError(
          "Max slots cannot be lower than the number of active slots"
        );
      }
    }

    const { password, ...rest } = data;
    const encrypted = password
      ? { ...credentialCipher.encrypt(password), needsCredentialReset: false }
      : {};
    const updated = await this.subscriptionRepository.update(id, {
      ...rest,
      ...encrypted,
    });

    const capacityGrew =
      data.maxSlots !== undefined && data.maxSlots > existing.maxSlots;
    if (capacityGrew) {
      await this.slotAssignmentService.processPending(
        updated.serviceProviderId,
        updated.countryId
      );
    }
    const capacityChanged =
      data.maxSlots !== undefined ||
      data.isActive !== undefined ||
      data.expiresAt !== undefined ||
      data.countryId !== undefined ||
      data.password !== undefined;
    if (capacityChanged) {
      await this.refreshCapacity(updated.serviceProviderId);
    }
    const refreshed = await this.subscriptionRepository.findById(id);
    return new Subscription(refreshed ?? updated).toResponse();
  }

  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }
    const serviceProviderId = subscription.serviceProviderId;
    await this.subscriptionRepository.delete(id);
    await this.refreshCapacity(serviceProviderId);
  }

  async getSubscriptionsByServiceProvider(
    serviceProviderId: string
  ): Promise<SubscriptionResponse[]> {
    const provider = await this.serviceProviderRepository.findById(serviceProviderId);
    if (!provider) {
      throw new NotFoundError("Service provider not found");
    }
    const subscriptions =
      await this.subscriptionRepository.findByServiceProviderId(serviceProviderId);
    return subscriptions.map((sub) => new Subscription(sub).toResponse());
  }

  async requestSubscriptionSlot(
    userId: string,
    data: CreateSubscriptionRequestData
  ): Promise<SubscriptionRequestResponse> {
    await this.assertProviderAndCountry(data.serviceProviderId, data.countryId);

    const existingSlot =
      await this.subscriptionSlotRepository.findActiveByUserAndProvider(
        userId,
        data.serviceProviderId
      );
    if (existingSlot) {
      throw new ConflictError(
        "You already have a slot assigned for this service provider",
        "DUPLICATE_REQUEST"
      );
    }

    const existingRequests = await this.subscriptionRequestRepository.findByUserId(userId);
    const hasPending = existingRequests.some(
      (request) =>
        request.serviceProviderId === data.serviceProviderId &&
        request.status === SubscriptionRequestStatus.PENDING &&
        request.countryId === (data.countryId ?? null)
    );
    if (hasPending) {
      throw new ConflictError(
        "You already have a pending request for this service provider and country",
        "DUPLICATE_REQUEST"
      );
    }

    const assignment = await this.slotAssignmentService.assignSlotToUser(
      userId,
      data.serviceProviderId,
      data.countryId
    );
    if (!assignment.success && assignment.message.startsWith("You already have")) {
      throw new ConflictError(assignment.message, "DUPLICATE_REQUEST");
    }

    const request = await this.subscriptionRequestRepository.create({
      userId,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
      status:
        assignment.success && assignment.slotAssignment
          ? SubscriptionRequestStatus.ASSIGNED
          : SubscriptionRequestStatus.PENDING,
      assignedSlotId: assignment.slotAssignment?.id,
      processedAt: assignment.slotAssignment ? new Date() : undefined,
    });
    await this.refreshCapacity(data.serviceProviderId);
    return this.withPlace(new SubscriptionRequest(request).toResponse());
  }

  async getUserSubscriptionSlots(
    userId: string
  ): Promise<SubscriptionSlotResponse[]> {
    const slots = await this.subscriptionSlotRepository.findByUserId(userId);
    return slots.map((slot) => new SubscriptionSlot(slot).toResponse());
  }

  async listMyRequests(userId: string): Promise<SubscriptionRequestResponse[]> {
    const requests = await this.subscriptionRequestRepository.findByUserId(userId);
    const responses = requests.map((request) => new SubscriptionRequest(request).toResponse());
    const pendingPools = new Map<string, { serviceProviderId: string; countryId: string | null }>();
    for (const response of responses) {
      if (response.status !== SubscriptionRequestStatus.PENDING) {
        continue;
      }
      const key = `${response.serviceProviderId}:${response.countryId ?? ""}`;
      pendingPools.set(key, {
        serviceProviderId: response.serviceProviderId,
        countryId: response.countryId ?? null,
      });
    }
    const places = new Map<string, number>();
    for (const pool of pendingPools.values()) {
      const ordered = await this.subscriptionRequestRepository.listPendingOrder(
        pool.serviceProviderId,
        pool.countryId
      );
      const numbered = numberByPool(
        ordered.map((row) => ({
          id: row.id,
          serviceProviderId: pool.serviceProviderId,
          countryId: pool.countryId,
        }))
      );
      for (const [id, place] of numbered) {
        places.set(id, place);
      }
    }
    return responses.map((response) => ({
      ...response,
      place:
        response.status === SubscriptionRequestStatus.PENDING
          ? (places.get(response.id) ?? null)
          : null,
    }));
  }

  async cancelRequest(
    requestId: string,
    userId: string
  ): Promise<SubscriptionRequestResponse> {
    const existing = await this.subscriptionRequestRepository.findById(requestId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Request not found");
    }
    if (existing.status !== SubscriptionRequestStatus.PENDING) {
      throw new ConflictError(
        "Only a pending request can be cancelled",
        "REQUEST_NOT_PENDING"
      );
    }
    const cancelled = await this.subscriptionRequestRepository.cancelIfPending(requestId);
    if (!cancelled) {
      throw new ConflictError(
        "Only a pending request can be cancelled",
        "REQUEST_NOT_PENDING"
      );
    }
    await this.refreshCapacity(existing.serviceProviderId);
    return new SubscriptionRequest(cancelled).toResponse();
  }

  private async withPlace(
    response: SubscriptionRequestResponse
  ): Promise<SubscriptionRequestResponse> {
    if (response.status !== SubscriptionRequestStatus.PENDING) {
      return { ...response, place: null };
    }
    const ordered = await this.subscriptionRequestRepository.listPendingOrder(
      response.serviceProviderId,
      response.countryId
    );
    const index = ordered.findIndex((row) => row.id === response.id);
    return { ...response, place: index === -1 ? null : index + 1 };
  }

  async revealCredentials(
    slotId: string,
    actor: { id: string; role: UserRole }
  ): Promise<CredentialReveal> {
    const slot = await this.requireOwnedSlot(slotId, actor);
    const subscription = await this.subscriptionRepository.findById(slot.subscriptionId);
    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }
    if (subscription.needsCredentialReset || !subscription.passwordCiphertext) {
      throw new ConflictError(
        "Credentials must be re-entered by an admin before they can be revealed",
        "CREDENTIALS_UNAVAILABLE"
      );
    }
    if (actor.role !== UserRole.ADMIN) {
      const allowed = this.seatAccess
        ? await this.seatAccess.customerCanUseSeat(slot)
        : false;
      if (!allowed) {
        throw new ForbiddenError(
          "Credentials are available after payment is confirmed",
          "PAYMENT_REQUIRED"
        );
      }
    }

    await this.revealStore?.record({
      actorUserId: actor.id,
      slotId,
      subscriptionId: subscription.id,
    });

    logger.info(
      { userId: actor.id, slotId, subscriptionId: subscription.id },
      "subscription credentials revealed"
    );

    return {
      email: subscription.email,
      password: credentialCipher.decrypt({
        passwordCiphertext: subscription.passwordCiphertext,
        passwordIv: subscription.passwordIv,
        passwordTag: subscription.passwordTag,
        keyVersion: subscription.keyVersion,
      }),
    };
  }

  async releaseSlot(
    slotId: string,
    actor: { id: string; role: UserRole }
  ): Promise<void> {
    const slot = await this.requireOwnedSlot(slotId, actor);
    await this.subscriptionSlotRepository.release(slot.id);
    await this.notifications?.notifySeatChange({
      userId: slot.userId,
      slotId: slot.id,
      subscriptionId: slot.subscriptionId,
      action: "freed",
    });
    if (slot.subscription) {
      await this.slotAssignmentService.processPending(
        slot.subscription.serviceProviderId,
        slot.subscription.countryId
      );
      await this.refreshCapacity(slot.subscription.serviceProviderId);
    }
  }

  async listOffers(): Promise<PublicOffer[]> {
    const rows = await this.subscriptionRepository.listOfferAccounts();
    const groups = new Map<string, PublicOffer & { priceValue: number }>();
    for (const row of rows) {
      if (!row.allocatable || row.userPrice === null || !row.currencyCode) {
        continue;
      }
      const key = `${row.serviceProviderId}:${row.countryId ?? ""}`;
      const priceValue = Number(row.userPrice);
      const free = Math.max(row.maxSlots - row.occupied, 0);
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          serviceProviderId: row.serviceProviderId,
          serviceProviderName: row.serviceProviderName,
          iconUrl: row.iconUrl,
          description: row.description,
          countryId: row.countryId,
          countryName: row.countryName,
          currencyCode: row.currencyCode,
          price: row.userPrice.toString(),
          freeSeats: free,
          priceValue,
        });
        continue;
      }
      current.freeSeats += free;
      if (priceValue < current.priceValue) {
        current.priceValue = priceValue;
        current.price = row.userPrice.toString();
        current.currencyCode = row.currencyCode;
      }
    }
    return [...groups.values()].map(({ priceValue: _priceValue, ...offer }) => offer);
  }

  async getLoginCode(
    slotId: string,
    actor: { id: string; role: UserRole }
  ): Promise<{ code: string; receivedAt: string } | null> {
    const slot = await this.requireOwnedSlot(slotId, actor);
    if (actor.role !== UserRole.ADMIN) {
      const allowed = this.seatAccess
        ? await this.seatAccess.customerCanUseSeat(slot)
        : false;
      if (!allowed) {
        throw new ForbiddenError(
          "Login codes are available after payment is confirmed",
          "PAYMENT_REQUIRED"
        );
      }
    }
    if (!this.inbox) {
      return null;
    }
    const code = await this.inbox.getRecentCode(slotId);
    if (!code) {
      return null;
    }
    return { code: code.code, receivedAt: code.receivedAt };
  }

  async reportIncident(
    slotId: string,
    userId: string,
    note: string
  ): Promise<IncidentView> {
    if (!this.incidents) {
      throw new ConflictError("Incidents are not available", "INCIDENTS_UNAVAILABLE");
    }
    return this.incidents.report(slotId, userId, note);
  }

  private async requireOwnedSlot(
    slotId: string,
    actor: { id: string; role: UserRole }
  ) {
    const slot = await this.subscriptionSlotRepository.findById(slotId);
    if (!slot || !slot.isActive || slot.releasedAt) {
      throw new NotFoundError("Slot not found");
    }
    if (actor.role !== UserRole.ADMIN && slot.userId !== actor.id) {
      throw new ForbiddenError("You cannot access this slot");
    }
    return slot;
  }

  private async assertProviderAndCountry(
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<void> {
    const provider = await this.serviceProviderRepository.findById(serviceProviderId);
    if (!provider) {
      throw new NotFoundError("Service provider not found");
    }
    if (!countryId) {
      return;
    }
    const country = await this.countryRepository.findById(countryId);
    if (!country) {
      throw new NotFoundError("Country not found");
    }
    if (!country.isActive) {
      throw new ValidationError("Country is not active");
    }
    const supported = await this.serviceProviderRepository.getSupportedCountries(
      serviceProviderId
    );
    if (!supported.some((item) => item.id === countryId)) {
      throw new ValidationError(
        "Service provider does not support the specified country"
      );
    }
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

export { SlotAssignmentService } from "./slotAssignmentService";

export function createSubscriptionService(
  subscriptionRepository: ISubscriptionRepository,
  subscriptionSlotRepository: ISubscriptionSlotRepository,
  subscriptionRequestRepository: ISubscriptionRequestRepository,
  serviceProviderRepository: IServiceProviderRepository,
  countryRepository: ICountryRepository,
  slotAssignmentService: ISlotAssignmentService,
  capacityForecast?: ICapacityForecastService
): ISubscriptionService {
  return new SubscriptionService(
    subscriptionRepository,
    subscriptionSlotRepository,
    subscriptionRequestRepository,
    serviceProviderRepository,
    countryRepository,
    slotAssignmentService,
    capacityForecast
  );
}
