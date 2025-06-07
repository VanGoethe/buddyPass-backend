/**
 * User Repository Implementation
 */

import { PrismaClient } from "@prisma/client";
import {
  IUserRepository,
  User,
  CreateUserData,
  UpdateUserData,
  UserRole,
  FindManyOptions,
  CountOptions,
} from "../../types/users";

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    return user;
  }

  async findMany(options?: FindManyOptions): Promise<User[]> {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      orderBy = { field: "createdAt", direction: "desc" },
    } = options || {};

    const skip = (page - 1) * limit;

    const where: any = {};
    if (role !== undefined) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [orderBy.field]: orderBy.direction,
      },
    });

    return users;
  }

  async count(options?: CountOptions): Promise<number> {
    const { role, isActive } = options || {};

    const where: any = {};
    if (role !== undefined) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const count = await this.prisma.user.count({
      where,
    });

    return count;
  }

  async create(userData: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        googleId: userData.googleId,
        provider: userData.provider,
        avatar: userData.avatar,
        role: userData.role || UserRole.USER,
      },
    });
    return user;
  }

  async update(id: string, userData: UpdateUserData): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
    });
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}

// Export a factory function to create repository instance
export const createUserRepository = (prisma: PrismaClient): IUserRepository => {
  return new PrismaUserRepository(prisma);
};
