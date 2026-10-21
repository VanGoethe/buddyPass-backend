import { PrismaClient, UserRole } from "@prisma/client";
import { UserService } from "../../../src/services/users";
import { IUserRepository, User } from "../../../src/types/users";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "../../../src/utils/errors";

function createPrisma(): PrismaClient {
  return {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "refresh-row" }),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as PrismaClient;
}

describe("UserService", () => {
  const mockUserRepository: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateProfile: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  let userService: UserService;

  const baseUser = (overrides: Partial<User> = {}): User => ({
    id: "user-123",
    email: "user@test.com",
    name: "Test User",
    role: UserRole.USER,
    provider: "local",
    isActive: true,
    isVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    password: "hashed-password",
    avatar: null,
    googleId: null,
    lastLoginAt: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockUserRepository, createPrisma());
  });

  describe("createAdmin", () => {
    const validAdminData = {
      email: "admin@test.com",
      password: "AdminPass123!",
      name: "Test Admin",
    };

    it("returns a user response without a password", async () => {
      const created = baseUser({
        id: "admin-123",
        email: validAdminData.email,
        name: validAdminData.name,
        role: UserRole.ADMIN,
        isVerified: true,
        avatar: "https://example.com/avatar.jpg",
      });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(created);
      jest.spyOn(userService, "hashPassword").mockResolvedValue("hashed-admin");

      const result = await userService.createAdmin(validAdminData);

      expect(result).toEqual({
        id: created.id,
        email: created.email,
        name: created.name,
        avatar: created.avatar,
        provider: created.provider,
        role: created.role,
        isVerified: true,
        isActive: true,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
      expect(result).not.toHaveProperty("password");
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: validAdminData.email,
        password: "hashed-admin",
        name: validAdminData.name,
        provider: "local",
        role: UserRole.ADMIN,
        isVerified: true,
      });
    });

    it("throws ConflictError when the email already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser());

      await expect(userService.createAdmin(validAdminData)).rejects.toBeInstanceOf(
        ConflictError
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("password utilities", () => {
    it("hashes and compares passwords", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await userService.hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      await expect(userService.comparePassword(password, hashedPassword)).resolves.toBe(
        true
      );
      await expect(
        userService.comparePassword("WrongPassword", hashedPassword)
      ).resolves.toBe(false);
    });
  });

  describe("JWT token utilities", () => {
    it("generates a token that verifyAccessToken accepts", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: UserRole.USER,
      };

      const token = userService.generateAccessToken(payload);
      const verified = userService.verifyAccessToken(token);

      expect(verified).toMatchObject(payload);
    });

    it("returns null for an invalid token", () => {
      expect(userService.verifyAccessToken("invalid-token")).toBeNull();
    });
  });

  describe("login", () => {
    const loginData = {
      email: "user@test.com",
      password: "UserPass123!",
    };

    it("returns a session after a valid password", async () => {
      const user = baseUser({ password: "stored-hash" });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockUserRepository.updateProfile.mockImplementation(async () => user);
      jest.spyOn(userService, "comparePassword").mockResolvedValue(true);
      jest.spyOn(userService, "generateAccessToken").mockReturnValue("access-token");

      const result = await userService.login(loginData);

      expect(result.user.email).toBe(loginData.email);
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(user.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it("throws INVALID_CREDENTIALS for a wrong password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser());
      jest.spyOn(userService, "comparePassword").mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
      await expect(userService.login(loginData)).rejects.toBeInstanceOf(
        UnauthorizedError
      );
    });

    it("throws USER_INACTIVE after a valid password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(
        baseUser({ isActive: false })
      );
      jest.spyOn(userService, "comparePassword").mockResolvedValue(true);

      await expect(userService.login(loginData)).rejects.toBeInstanceOf(
        ForbiddenError
      );
      await expect(userService.login(loginData)).rejects.toMatchObject({
        code: "USER_INACTIVE",
      });
    });
  });
});
