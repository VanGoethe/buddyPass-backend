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

const userInclude = { country: true } as const;

type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password: row.password,
    avatar: row.avatar,
    googleId: row.googleId,
    provider: row.provider,
    role: row.role,
    isVerified: row.isVerified,
    isActive: row.isActive,
    phone: row.phone,
    countryId: row.countryId,
    timezone: row.timezone,
    age: row.age,
    heardAboutUs: row.heardAboutUs,
    metadata: row.metadata,
    country: row.country
      ? { id: row.country.id, name: row.country.name, code: row.country.code }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
  };
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, include: userInclude });
    return row ? toUser(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { googleId },
      include: userInclude,
    });
    return row ? toUser(row) : null;
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

    const rows = await this.prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderBy.field]: orderBy.direction },
      include: userInclude,
    });
    return rows.map(toUser);
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
    const row = await this.prisma.user.create({
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
      include: userInclude,
    });
    return toUser(row);
  }

  async updateProfile(id: string, userData: UpdateProfileData): Promise<User> {
    const data: Prisma.UserUpdateInput = {
      name: userData.name,
      avatar: userData.avatar,
      password: userData.password,
      googleId: userData.googleId,
      provider: userData.provider,
      isVerified: userData.isVerified,
      lastLoginAt: userData.lastLoginAt,
      phone: userData.phone,
      timezone: userData.timezone,
      age: userData.age,
      heardAboutUs: userData.heardAboutUs,
    };
    if (userData.metadata !== undefined) {
      data.metadata = userData.metadata === null ? Prisma.JsonNull : userData.metadata;
    }
    if (userData.countryId !== undefined) {
      data.country = userData.countryId
        ? { connect: { id: userData.countryId } }
        : { disconnect: true };
    }
    const row = await this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });
    return toUser(row);
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
