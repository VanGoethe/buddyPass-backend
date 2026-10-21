import { UserRole } from "@prisma/client";
import {
  IUserRepository,
  IUserService,
  UpdateProfileRequest,
  UserResponse,
} from "../../types/users";
import { ISubscriptionRepository } from "../../types/subscriptions";
import { IServiceProviderRepository } from "../../types/serviceProviders";
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
    private serviceProviderRepository: IServiceProviderRepository
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
    lastUpdated: string;
  }> {
    const [totalUsers, totalSubscriptions, totalServiceProviders] =
      await Promise.all([
        this.userRepository.count(),
        this.subscriptionRepository.count(),
        this.serviceProviderRepository.count(),
      ]);
    return {
      statistics: { totalUsers, totalSubscriptions, totalServiceProviders },
      lastUpdated: new Date().toISOString(),
    };
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

  async getUser(userId: string): Promise<AdminUserView> {
    const user = await this.requireUser(userId);
    return this.toAdminView(user);
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
  serviceProviderRepository: IServiceProviderRepository
): AdminService {
  return new AdminService(
    userRepository,
    userService,
    subscriptionRepository,
    serviceProviderRepository
  );
}
