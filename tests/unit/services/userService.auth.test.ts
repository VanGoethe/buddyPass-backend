import { PrismaClient } from "@prisma/client";
import { UserService } from "../../../src/services/users";
import { IUserRepository, User } from "../../../src/types/users";
import { UserRole } from "@prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../src/utils/errors";
import { accessTokenSignOptions } from "../../../src/config/auth";

jest.mock("jsonwebtoken");
jest.mock("bcryptjs");

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

function createPrisma(): PrismaClient {
  return {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "refresh-row" }),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

describe("UserService Authentication", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let prisma: PrismaClient;

  const mockUser: User = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    password: "hashedpassword",
    avatar: null,
    googleId: null,
    provider: "local",
    role: UserRole.USER,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrisma();
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      updateProfile: jest.fn(),
      updateRole: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    };
    userService = new UserService(mockUserRepository, prisma);
  });

  describe("hashPassword", () => {
    it("hashes with the configured salt rounds", async () => {
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      await expect(userService.hashPassword("testPassword123!")).resolves.toBe(
        "hashed-password"
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith("testPassword123!", 12);
    });
  });

  describe("comparePassword", () => {
    it("returns the bcrypt comparison result", async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        userService.comparePassword("testPassword123!", "hashed-password")
      ).resolves.toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "testPassword123!",
        "hashed-password"
      );
    });
  });

  describe("generateAccessToken", () => {
    it("signs an access token with the configured options", () => {
      const payload = {
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      };
      (mockJwt.sign as jest.Mock).mockReturnValue("generated-token");

      expect(userService.generateAccessToken(payload)).toBe("generated-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        accessTokenSignOptions
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies issuer, audience, and HS256", () => {
      const payload = {
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      };
      mockJwt.verify.mockReturnValue(payload as never);

      expect(userService.verifyAccessToken("valid-token")).toEqual(payload);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        "valid-token",
        process.env.JWT_SECRET,
        {
          algorithms: ["HS256"],
          issuer: "buddypass",
          audience: "buddypass-api",
        }
      );
    });

    it("returns null when verification throws", () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(userService.verifyAccessToken("invalid-token")).toBeNull();
    });
  });

  describe("register", () => {
    it("returns an auth session for a new user", async () => {
      const registerData = {
        email: "newuser@example.com",
        password: "testPassword123!",
        name: "New User",
      };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: registerData.email,
        name: registerData.name,
        password: "hashed-password",
      });
      (mockJwt.sign as jest.Mock).mockReturnValue("access-token");

      const result = await userService.register(registerData);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: registerData.email,
        password: "hashed-password",
        name: registerData.name,
        provider: "local",
      });
      expect(result.user.email).toBe(registerData.email);
      expect(result.user).not.toHaveProperty("password");
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it("throws ConflictError when the email already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        userService.register({
          email: "existing@example.com",
          password: "testPassword123!",
          name: "Existing User",
        })
      ).rejects.toMatchObject({
        code: "EMAIL_EXISTS",
        message: "User with this email already exists",
      });
      await expect(
        userService.register({
          email: "existing@example.com",
          password: "testPassword123!",
        })
      ).rejects.toBeInstanceOf(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginData = {
      email: "test@example.com",
      password: "testPassword123!",
    };

    it("returns an auth session and records last login", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.updateProfile.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      (mockJwt.sign as jest.Mock).mockReturnValue("access-token");

      const result = await userService.login(loginData);

      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        { lastLoginAt: expect.any(Date) }
      );
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user.email).toBe(loginData.email);
      expect(result.user).not.toHaveProperty("password");
    });

    it("throws INVALID_CREDENTIALS for a wrong password", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toBeInstanceOf(
        UnauthorizedError
      );
      await expect(userService.login(loginData)).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      expect(mockUserRepository.updateProfile).not.toHaveBeenCalled();
    });

    it("throws USER_INACTIVE after a valid password when the account is inactive", async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(userService.login(loginData)).rejects.toBeInstanceOf(
        ForbiddenError
      );
      await expect(userService.login(loginData)).rejects.toMatchObject({
        code: "USER_INACTIVE",
      });
      expect(mockUserRepository.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe("refresh and logout", () => {
    it("rotates a valid refresh token into a new session", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: "rt-1",
        tokenHash: "stored",
        familyId: "family-1",
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (mockJwt.sign as jest.Mock).mockReturnValue("next-access");

      const result = await userService.refresh("raw-refresh-token");

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "rt-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe("next-access");
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it("throws when the refresh token is unknown", async () => {
      await expect(userService.refresh("missing")).rejects.toMatchObject({
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("revokes a known refresh token on logout", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
      });

      await expect(userService.logout("raw-refresh-token")).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });
  });

  describe("profile", () => {
    it("returns a user response without a password", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getProfile(mockUser.id);

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });
      expect(result).not.toHaveProperty("password");
    });

    it("throws NotFoundError when the user is missing", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getProfile("missing")).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it("updates the profile through updateProfile", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateProfile.mockResolvedValue({
        ...mockUser,
        name: "Updated Name",
      });

      const result = await userService.updateProfile(mockUser.id, {
        name: "Updated Name",
      });

      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(mockUser.id, {
        name: "Updated Name",
        avatar: mockUser.avatar,
      });
      expect(result.name).toBe("Updated Name");
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("handleGoogleOAuth", () => {
    const profile = {
      googleId: "google-123",
      email: "google@example.com",
      name: "Google User",
      avatar: "https://example.com/a.png",
      emailVerified: true,
    };

    it("links a verified local account", async () => {
      const localUser = {
        ...mockUser,
        email: profile.email,
        isVerified: true,
        googleId: null,
      };
      const linked = { ...localUser, googleId: profile.googleId };
      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(localUser);
      mockUserRepository.updateProfile.mockResolvedValue(linked);

      await expect(userService.handleGoogleOAuth(profile)).resolves.toEqual(linked);
      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(localUser.id, {
        googleId: profile.googleId,
        name: profile.name,
        avatar: profile.avatar,
        lastLoginAt: expect.any(Date),
      });
    });

    it("throws GOOGLE_LINK_UNVERIFIED when the local account is unverified", async () => {
      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        email: profile.email,
        isVerified: false,
      });

      await expect(userService.handleGoogleOAuth(profile)).rejects.toMatchObject({
        code: "GOOGLE_LINK_UNVERIFIED",
      });
      await expect(userService.handleGoogleOAuth(profile)).rejects.toBeInstanceOf(
        ConflictError
      );
      expect(mockUserRepository.updateProfile).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("creates a new google user", async () => {
      const created = {
        ...mockUser,
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        provider: "google" as const,
        avatar: profile.avatar,
        isVerified: true,
      };
      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(created);

      await expect(userService.handleGoogleOAuth(profile)).resolves.toEqual(created);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        provider: "google",
        avatar: profile.avatar,
        isVerified: true,
      });
    });
  });
});
