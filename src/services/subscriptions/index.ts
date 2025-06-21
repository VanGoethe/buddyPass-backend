/**
 * Subscription Service Implementation
 */

import bcrypt from "bcryptjs";
import {
  ISubscriptionService,
  ISlotAssignmentService,
  ISubscriptionRepository,
  ISubscriptionSlotRepository,
  ISubscriptionRequestRepository,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionQueryOptions,
  SubscriptionResponse,
  SubscriptionListResponse,
  CreateSubscriptionRequestData,
  SubscriptionRequestResponse,
  SubscriptionSlotResponse,
  SubscriptionRequestStatus,
  ISubscriptionSlot,
} from "../../types/subscriptions";
import { IServiceProviderRepository } from "../../types/serviceProviders";
import { ICountryRepository } from "../../types/countries";
import {
  Subscription,
  SubscriptionSlot,
  SubscriptionRequest,
} from "../../models/subscriptions";

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
    // Validate the data
    Subscription.validateCreateData(data);

    // Check if service provider exists
    const serviceProvider = await this.serviceProviderRepository.findById(
      data.serviceProviderId
    );
    if (!serviceProvider) {
      throw new Error("Service provider not found");
    }

    // Check if country exists and is supported by the service provider
    if (data.countryId) {
      const country = await this.countryRepository.findById(data.countryId);
      if (!country) {
        throw new Error("Country not found");
      }

      if (!country.isActive) {
        throw new Error("Country is not active");
      }

      // Check if service provider supports this country
      const supportedCountries =
        await this.serviceProviderRepository.getSupportedCountries(
          data.serviceProviderId
        );
      const isCountrySupported = supportedCountries.some(
        (c) => c.id === data.countryId
      );

      if (!isCountrySupported) {
        throw new Error(
          "Service provider does not support the specified country"
        );
      }
    }

    // Check for duplicate email
    const existsWithEmail = await this.subscriptionRepository.existsByEmail(
      data.email
    );
    if (existsWithEmail) {
      throw new Error("A subscription with this email already exists");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create the subscription
    const subscription = await this.subscriptionRepository.create({
      ...data,
      passwordHash,
    });

    return new Subscription(subscription).toResponse();
  }

  async getSubscriptionById(id: string): Promise<SubscriptionResponse> {
    const subscription = await this.subscriptionRepository.findById(id, true);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return new Subscription(subscription).toResponse();
  }

  async getSubscriptions(
    options?: SubscriptionQueryOptions
  ): Promise<SubscriptionListResponse> {
    const { subscriptions, total } = await this.subscriptionRepository.findMany(
      options
    );

    const page = options?.page || 1;
    const limit = options?.limit || 10;

    return {
      subscriptions: subscriptions.map((sub) =>
        new Subscription(sub).toResponse()
      ),
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
    // Validate the update data
    Subscription.validateUpdateData(data);

    // Check if subscription exists
    const existingSubscription = await this.subscriptionRepository.findById(id);
    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    // Check if country exists if provided
    if (data.countryId) {
      const country = await this.countryRepository.findById(data.countryId);
      if (!country) {
        throw new Error("Country not found");
      }

      if (!country.isActive) {
        throw new Error("Country is not active");
      }

      // Check if service provider supports this country
      const supportedCountries =
        await this.serviceProviderRepository.getSupportedCountries(
          existingSubscription.serviceProviderId
        );
      const isCountrySupported = supportedCountries.some(
        (c) => c.id === data.countryId
      );

      if (!isCountrySupported) {
        throw new Error(
          "Service provider does not support the specified country"
        );
      }
    }

    // Check for duplicate email if email is being updated
    if (data.email) {
      const existsWithEmail = await this.subscriptionRepository.existsByEmail(
        data.email,
        id
      );
      if (existsWithEmail) {
        throw new Error("A subscription with this email already exists");
      }
    }

    // Hash password if provided
    let updateData: UpdateSubscriptionData & { passwordHash?: string } = {
      ...data,
    };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    const subscription = await this.subscriptionRepository.update(
      id,
      updateData
    );

    return new Subscription(subscription).toResponse();
  }

  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await this.subscriptionRepository.delete(id);
  }

  async getSubscriptionsByServiceProvider(
    serviceProviderId: string
  ): Promise<SubscriptionResponse[]> {
    const subscriptions =
      await this.subscriptionRepository.findByServiceProviderId(
        serviceProviderId
      );

    return subscriptions.map((sub) => new Subscription(sub).toResponse());
  }

  async requestSubscriptionSlot(
    userId: string,
    data: CreateSubscriptionRequestData
  ): Promise<SubscriptionRequestResponse> {
    // Validate request data
    SubscriptionRequest.validateRequestData({
      userId,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
    });

    // Check if service provider exists
    const serviceProvider = await this.serviceProviderRepository.findById(
      data.serviceProviderId
    );
    if (!serviceProvider) {
      throw new Error("Service provider not found");
    }

    // Check if country exists if provided
    if (data.countryId) {
      const country = await this.countryRepository.findById(data.countryId);
      if (!country) {
        throw new Error("Country not found");
      }

      if (!country.isActive) {
        throw new Error("Country is not active");
      }

      // Check if service provider supports this country
      const supportedCountries =
        await this.serviceProviderRepository.getSupportedCountries(
          data.serviceProviderId
        );
      const isCountrySupported = supportedCountries.some(
        (c) => c.id === data.countryId
      );

      if (!isCountrySupported) {
        throw new Error(
          "Service provider does not support the specified country"
        );
      }
    }

    // Check if user already has a pending request for this service provider
    const existingRequests =
      await this.subscriptionRequestRepository.findByUserId(userId);
    const hasPendingRequest = existingRequests.some(
      (req) =>
        req.serviceProviderId === data.serviceProviderId &&
        req.status === SubscriptionRequestStatus.PENDING &&
        req.countryId === data.countryId
    );

    if (hasPendingRequest) {
      throw new Error(
        "You already have a pending request for this service provider and country"
      );
    }

    // Try to assign slot immediately
    const assignmentResult = await this.slotAssignmentService.assignSlotToUser(
      userId,
      data.serviceProviderId,
      data.countryId
    );

    // Create the request with appropriate status
    const request = await this.subscriptionRequestRepository.create({
      userId,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
    });

    if (assignmentResult.success && assignmentResult.slotAssignment) {
      // Update request status to ASSIGNED
      await this.subscriptionRequestRepository.update(request.id, {
        status: SubscriptionRequestStatus.ASSIGNED,
        assignedSlotId: assignmentResult.slotAssignment.id,
        processedAt: new Date(),
      });

      const updatedRequest = await this.subscriptionRequestRepository.findById(
        request.id
      );
      if (updatedRequest) {
        return new SubscriptionRequest(updatedRequest).toResponse();
      }
    }

    // Return pending request
    return new SubscriptionRequest(request).toResponse();
  }

  async getUserSubscriptionSlots(
    userId: string
  ): Promise<SubscriptionSlotResponse[]> {
    const slots = await this.subscriptionSlotRepository.findByUserId(userId);
    return slots.map((slot) => new SubscriptionSlot(slot).toResponse());
  }
}

export class SlotAssignmentService implements ISlotAssignmentService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private subscriptionSlotRepository: ISubscriptionSlotRepository
  ) {}

  async assignSlotToUser(
    userId: string,
    serviceProviderId: string,
    countryId?: string
  ): Promise<{
    success: boolean;
    slotAssignment?: ISubscriptionSlot;
    message: string;
  }> {
    try {
      // Check if user already has a slot for this service provider/country combination
      const availableSubscriptions =
        await this.subscriptionRepository.findAvailableByServiceProviderId(
          serviceProviderId,
          countryId
        );

      // Check if user already has a slot in any of these subscriptions
      for (const subscription of availableSubscriptions) {
        const existingSlot =
          await this.subscriptionSlotRepository.findByUserAndSubscription(
            userId,
            subscription.id
          );
        if (existingSlot) {
          return {
            success: false,
            message:
              "You already have a slot assigned for this service provider",
          };
        }
      }

      // Find the best available subscription to fill
      const targetSubscription = await this.findAvailableSlot(
        serviceProviderId,
        countryId
      );

      if (!targetSubscription) {
        return {
          success: false,
          message:
            "No available slots found. All subscriptions are currently full, but new subscriptions will be created shortly. Please try again later.",
        };
      }

      // Validate that the subscription still has available slots
      const isValidAssignment = await this.validateSlotAssignment(
        targetSubscription.id
      );
      if (!isValidAssignment) {
        return {
          success: false,
          message:
            "Selected subscription is no longer available. Please try again.",
        };
      }

      // Create the slot assignment and decrement available slots atomically
      const slotAssignment = await this.subscriptionSlotRepository.create({
        userId,
        subscriptionId: targetSubscription.id,
      });

      // Decrement available slots
      await this.subscriptionRepository.decrementAvailableSlots(
        targetSubscription.id
      );

      return {
        success: true,
        slotAssignment,
        message: "Slot successfully assigned",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to assign slot: ${error.message}`,
      };
    }
  }

  async findAvailableSlot(
    serviceProviderId: string,
    countryId?: string
  ): Promise<any | null> {
    const availableSubscriptions =
      await this.subscriptionRepository.findAvailableByServiceProviderId(
        serviceProviderId,
        countryId
      );

    // Filter out inactive or expired subscriptions
    const validSubscriptions = availableSubscriptions.filter((sub) => {
      const subscription = new Subscription(sub);
      return (
        subscription.isActiveAndValid() && subscription.hasAvailableSlots()
      );
    });

    if (validSubscriptions.length === 0) {
      return null;
    }

    // Return the subscription with the fewest available slots (to fill them up one by one)
    // The repository already orders by availableSlots DESC, so we want the last one (fewest slots)
    return validSubscriptions[validSubscriptions.length - 1];
  }

  async validateSlotAssignment(subscriptionId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findById(
      subscriptionId
    );
    if (!subscription) {
      return false;
    }

    const domainSubscription = new Subscription(subscription);
    if (
      !domainSubscription.isActiveAndValid() ||
      !domainSubscription.hasAvailableSlots()
    ) {
      return false;
    }

    // Double-check that occupied slots don't exceed available slots
    const occupiedSlots =
      await this.subscriptionSlotRepository.countBySubscriptionId(
        subscriptionId
      );
    const totalSlots = occupiedSlots + subscription.availableSlots;

    return occupiedSlots < totalSlots;
  }
}

/**
 * Factory function to create Subscription service
 */
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
