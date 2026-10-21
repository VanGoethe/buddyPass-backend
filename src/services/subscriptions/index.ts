import { UserRole } from "@prisma/client";
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

export class SubscriptionService implements ISubscriptionService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private subscriptionSlotRepository: ISubscriptionSlotRepository,
    private subscriptionRequestRepository: ISubscriptionRequestRepository,
    private serviceProviderRepository: IServiceProviderRepository,
    private countryRepository: ICountryRepository,
    private slotAssignmentService: ISlotAssignmentService
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
    const refreshed = await this.subscriptionRepository.findById(id);
    return new Subscription(refreshed ?? updated).toResponse();
  }

  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }
    await this.subscriptionRepository.delete(id);
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
    return new SubscriptionRequest(request).toResponse();
  }

  async getUserSubscriptionSlots(
    userId: string
  ): Promise<SubscriptionSlotResponse[]> {
    const slots = await this.subscriptionSlotRepository.findByUserId(userId);
    return slots.map((slot) => new SubscriptionSlot(slot).toResponse());
  }

  async listMyRequests(userId: string): Promise<SubscriptionRequestResponse[]> {
    const requests = await this.subscriptionRequestRepository.findByUserId(userId);
    return requests.map((request) => new SubscriptionRequest(request).toResponse());
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
    if (slot.subscription) {
      await this.slotAssignmentService.processPending(
        slot.subscription.serviceProviderId,
        slot.subscription.countryId
      );
    }
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
}

export { SlotAssignmentService } from "./slotAssignmentService";

export function createSubscriptionService(
  subscriptionRepository: ISubscriptionRepository,
  subscriptionSlotRepository: ISubscriptionSlotRepository,
  subscriptionRequestRepository: ISubscriptionRequestRepository,
  serviceProviderRepository: IServiceProviderRepository,
  countryRepository: ICountryRepository,
  slotAssignmentService: ISlotAssignmentService
): ISubscriptionService {
  return new SubscriptionService(
    subscriptionRepository,
    subscriptionSlotRepository,
    subscriptionRequestRepository,
    serviceProviderRepository,
    countryRepository,
    slotAssignmentService
  );
}
