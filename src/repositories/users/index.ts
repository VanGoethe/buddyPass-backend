import { Prisma, PrismaClient } from "@prisma/client";
import {
  IUserRepository,
  User,
  CreateUserData,
  UpdateProfileData,
  UserRole,
  FindManyOptions,
  CountOptions,
} from "../../types/users";

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findMany(options?: FindManyOptions): Promise<User[]> {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      orderBy = { field: "createdAt", direction: "desc" },
    } = options || {};

    const where: Prisma.UserWhereInput = {};
    if (role !== undefined) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderBy.field]: orderBy.direction },
    });
  }

  async count(options?: CountOptions): Promise<number> {
    const where: Prisma.UserWhereInput = {};
    if (options?.role !== undefined) {
      where.role = options.role;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    return this.prisma.user.count({ where });
  }

  async create(userData: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        googleId: userData.googleId,
        provider: userData.provider,
        avatar: userData.avatar,
        role: userData.role || UserRole.USER,
        isVerified: userData.isVerified ?? false,
      },
    });
  }

  async updateProfile(id: string, userData: UpdateProfileData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: userData.name,
        avatar: userData.avatar,
        password: userData.password,
        googleId: userData.googleId,
        provider: userData.provider,
        isVerified: userData.isVerified,
        lastLoginAt: userData.lastLoginAt,
      },
    });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

export const createUserRepository = (
  prisma: PrismaClient
): IUserRepository => {
  return new PrismaUserRepository(prisma);
};
