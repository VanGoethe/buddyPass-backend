import { UserRole } from "@prisma/client";
import {
  IUserRepository,
  IUserService,
  UpdateProfileRequest,
  UserResponse,
} from "../../types/users";
import {
  CapacityAlertView,
  ICapacityForecastService,
  OpenCapacityAlertSummary,
} from "../../types/capacity";
import { IServiceProviderRepository } from "../../types/serviceProviders";
import {
  CreateSubscriptionData,
  ISubscriptionRepository,
  ISubscriptionRequestRepository,
  ISubscriptionService,
  ISubscriptionSlotRepository,
  PendingRequestRow,
} from "../../types/subscriptions";
import { IRevealStore } from "../../repositories/reveals";
import { SubscriptionRequest, SubscriptionSlot } from "../../models/subscriptions";
import {
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export interface AdminUserView extends UserResponse {
  lastLoginAt?: Date | null;
}

export interface AdminListQuery {
  page: number;
  limit: number;
  status: "active" | "inactive" | "all";
  role: "USER" | "ADMIN" | "all";
}

export class AdminService {
  constructor(
    private userRepository: IUserRepository,
    private userService: IUserService,
    private subscriptionRepository: ISubscriptionRepository,
    private serviceProviderRepository: IServiceProviderRepository,
    private capacityForecast: ICapacityForecastService,
    private subscriptionSlotRepository: ISubscriptionSlotRepository,
    private subscriptionRequestRepository: ISubscriptionRequestRepository,
    private subscriptionService: ISubscriptionService,
    private revealStore: IRevealStore
  ) {}

  async createAdmin(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<UserResponse> {
    return this.userService.createAdmin(data);
  }

  async getDashboard(): Promise<{
    statistics: {
      totalUsers: number;
      totalSubscriptions: number;
      totalServiceProviders: number;
    };
    inventory: Awaited<ReturnType<ISubscriptionRepository["inventoryByService"]>>;
    waitingCount: number;
    expiringAccounts: Awaited<ReturnType<ISubscriptionRepository["listExpiringAccounts"]>>;
    openCapacityAlerts: OpenCapacityAlertSummary;
    lastUpdated: string;
  }> {
    const [
      totalUsers,
      totalSubscriptions,
      totalServiceProviders,
      openCapacityAlerts,
      inventory,
      waitingCount,
      expiringAccounts,
      pending,
    ] = await Promise.all([
      this.userRepository.count(),
      this.subscriptionRepository.count(),
      this.serviceProviderRepository.count(),
      this.capacityForecast.getOpenAlertSummary(),
      this.subscriptionRepository.inventoryByService(),
      this.subscriptionRequestRepository.countPending(),
      this.subscriptionRepository.listExpiringAccounts(7),
      this.subscriptionRequestRepository.listPendingDetailed(),
    ]);
    return {
      statistics: { totalUsers, totalSubscriptions, totalServiceProviders },
      inventory,
      waitingCount,
      expiringAccounts,
      openCapacityAlerts: {
        ...openCapacityAlerts,
        alerts: this.withWaiters(openCapacityAlerts.alerts, pending),
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async listCapacityAlerts(): Promise<OpenCapacityAlertSummary["alerts"]> {
    const [alerts, pending] = await Promise.all([
      this.capacityForecast.listOpenAlerts(),
      this.subscriptionRequestRepository.listPendingDetailed(),
    ]);
    return this.withWaiters(alerts, pending);
  }

  async listUsers(query: AdminListQuery): Promise<{
    users: AdminUserView[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const options = {
      page: query.page,
      limit: query.limit,
      isActive:
        query.status === "all" ? undefined : query.status === "active",
      role: query.role === "all" ? undefined : (query.role as UserRole),
    };
    const [users, total] = await Promise.all([
      this.userRepository.findMany(options),
      this.userRepository.count({
        role: options.role,
        isActive: options.isActive,
      }),
    ]);
    return {
      users: users.map((user) => this.toAdminView(user)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUser(userId: string) {
    const user = await this.requireUser(userId);
    const [seats, requests] = await Promise.all([
      this.subscriptionSlotRepository.findByUserId(userId),
      this.subscriptionRequestRepository.findByUserId(userId),
    ]);
    return {
      ...this.toAdminView(user),
      seats: seats.map((seat) =>
        seat instanceof SubscriptionSlot ? seat.toResponse() : seat
      ),
      pendingRequests: requests
        .filter((request) => request.status === "PENDING")
        .map((request) =>
          request instanceof SubscriptionRequest ? request.toResponse() : request
        ),
    };
  }

  async setVerified(userId: string, isVerified: boolean): Promise<AdminUserView> {
    await this.requireUser(userId);
    await this.userRepository.updateProfile(userId, { isVerified });
    const updated = await this.requireUser(userId);
    return this.toAdminView(updated);
  }

  async listWaitingLine() {
    const rows = await this.subscriptionRequestRepository.listPendingDetailed();
    const places = new Map<string, number>();
    return rows.map((row) => {
      const key = `${row.serviceProviderId}:${row.countryId ?? ""}`;
      const place = (places.get(key) ?? 0) + 1;
      places.set(key, place);
      return {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        serviceProviderId: row.serviceProviderId,
        serviceProviderName: row.serviceProviderName,
        countryId: row.countryId,
        countryName: row.countryName,
        place,
        requestedAt: row.requestedAt.toISOString(),
      };
    });
  }

  async createAccountFromAlert(
    alertId: string,
    data: Omit<CreateSubscriptionData, "serviceProviderId" | "countryId">
  ) {
    const alerts = await this.capacityForecast.listOpenAlerts();
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert) {
      throw new NotFoundError("Capacity alert not found");
    }
    return this.subscriptionService.createSubscription({
      ...data,
      serviceProviderId: alert.serviceProviderId,
      countryId: alert.countryId ?? undefined,
    });
  }

  async listReveals(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }
    return this.revealStore.listBySubscription(subscriptionId);
  }

  async updateStatus(
    actorId: string,
    userId: string,
    isActive: boolean
  ): Promise<AdminUserView> {
    if (actorId === userId && !isActive) {
      throw new ValidationError(
        "Cannot deactivate your own account",
        undefined,
        "SELF_DEACTIVATION_ERROR"
      );
    }
    await this.requireUser(userId);
    const updated = await this.userRepository.updateStatus(userId, isActive);
    return this.toAdminView(updated);
  }

  async updateRole(
    actorId: string,
    userId: string,
    role: UserRole
  ): Promise<AdminUserView> {
    if (actorId === userId) {
      throw new ValidationError(
        "Cannot change your own role",
        undefined,
        "SELF_ROLE_CHANGE_ERROR"
      );
    }
    await this.requireUser(userId);
    const updated = await this.userRepository.updateRole(userId, role);
    return this.toAdminView(updated);
  }

  async updateUser(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<AdminUserView> {
    if (data.name === undefined && data.avatar === undefined) {
      throw new ValidationError(
        "No valid update data provided",
        undefined,
        "NO_UPDATE_DATA"
      );
    }
    await this.requireUser(userId);
    const updated = await this.userService.updateProfile(userId, data);
    const full = await this.requireUser(updated.id);
    return this.toAdminView(full);
  }

  async deleteUser(actorId: string, userId: string): Promise<void> {
    if (actorId === userId) {
      throw new ValidationError(
        "Cannot delete your own account",
        undefined,
        "SELF_DELETION_ERROR"
      );
    }
    await this.requireUser(userId);
    await this.userRepository.delete(userId);
  }

  private withWaiters(
    alerts: CapacityAlertView[],
    pending: PendingRequestRow[]
  ): CapacityAlertView[] {
    return alerts.map((alert) => {
      const waiting = pending
        .filter(
          (row) =>
            row.serviceProviderId === alert.serviceProviderId &&
            (row.countryId ?? null) === (alert.countryId ?? null)
        )
        .map((row, index) => ({
          userId: row.userId,
          name: row.userName,
          requestedAt: row.requestedAt.toISOString(),
          place: index + 1,
        }));
      return {
        ...alert,
        waiting,
        freeSeats: alert.headroom + alert.pendingCount,
      };
    });
  }

  private async requireUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  private toAdminView(user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
    provider?: UserResponse["provider"];
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
  }): AdminUserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

export function createAdminService(
  userRepository: IUserRepository,
  userService: IUserService,
  subscriptionRepository: ISubscriptionRepository,
  serviceProviderRepository: IServiceProviderRepository,
  capacityForecast: ICapacityForecastService,
  subscriptionSlotRepository: ISubscriptionSlotRepository,
  subscriptionRequestRepository: ISubscriptionRequestRepository,
  subscriptionService: ISubscriptionService,
  revealStore: IRevealStore
): AdminService {
  return new AdminService(
    userRepository,
    userService,
    subscriptionRepository,
    serviceProviderRepository,
    capacityForecast,
    subscriptionSlotRepository,
    subscriptionRequestRepository,
    subscriptionService,
    revealStore
  );
}
