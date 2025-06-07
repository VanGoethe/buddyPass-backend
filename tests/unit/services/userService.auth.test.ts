/**
 * User Service Authentication Unit Tests
 */

import { UserService } from "../../../src/services/users";
import { IUserRepository, User } from "../../../src/types/users";
import { UserRole } from "@prisma/client";

// Mock the dependencies completely
jest.mock("jsonwebtoken");
jest.mock("bcryptjs");

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("UserService Authentication", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

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
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mock
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    userService = new UserService(mockUserRepository);
  });

  describe("hashPassword", () => {
    it("should hash password with correct salt rounds", async () => {
      const password = "testPassword123!";
      const hashedPassword = "hashed-password";

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await userService.hashPassword(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it("should throw error when hashing fails", async () => {
      const password = "testPassword123!";

      (mockBcrypt.hash as jest.Mock).mockRejectedValue(
        new Error("Hashing failed")
      );

      await expect(userService.hashPassword(password)).rejects.toThrow(
        "Hashing failed"
      );
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching passwords", async () => {
      const password = "testPassword123!";
      const hash = "hashed-password";

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.comparePassword(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it("should return false for non-matching passwords", async () => {
      const password = "testPassword123!";
      const hash = "hashed-password";

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await userService.comparePassword(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it("should throw error when comparison fails", async () => {
      const password = "testPassword123!";
      const hash = "hashed-password";

      (mockBcrypt.compare as jest.Mock).mockRejectedValue(
        new Error("Comparison failed")
      );

      await expect(userService.comparePassword(password, hash)).rejects.toThrow(
        "Comparison failed"
      );
    });
  });

  describe("generateAccessToken", () => {
    it("should generate access token with correct payload", () => {
      const payload = {
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      };
      const token = "generated-token";

      (mockJwt.sign as jest.Mock).mockReturnValue(token);

      const result = userService.generateAccessToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String),
        })
      );
      expect(result).toBe(token);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify valid token and return payload", () => {
      const token = "valid-token";
      const payload = { userId: "user-1", email: "test@example.com" };

      mockJwt.verify.mockReturnValue(payload as any);

      const result = userService.verifyAccessToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(result).toEqual(payload);
    });

    it("should return null for invalid token", () => {
      const token = "invalid-token";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = userService.verifyAccessToken(token);

      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      const token = "expired-token";

      mockJwt.verify.mockImplementation(() => {
        const error = new Error("Token expired");
        (error as any).name = "TokenExpiredError";
        throw error;
      });

      const result = userService.verifyAccessToken(token);

      expect(result).toBeNull();
    });
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      const registerData = {
        email: "newuser@example.com",
        password: "testPassword123!",
        name: "New User",
      };

      const hashedPassword = "hashed-password";
      const accessToken = "access-token";

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: registerData.email,
        name: registerData.name,
        password: hashedPassword,
      });
      (mockJwt.sign as jest.Mock).mockReturnValue(accessToken);

      const result = await userService.register(registerData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        registerData.email
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: registerData.email,
        password: hashedPassword,
        name: registerData.name,
        provider: "local",
      });

      expect(result).toMatchObject({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            email: registerData.email,
            name: registerData.name,
          },
          accessToken,
        },
      });
    });

    it("should fail registration when user already exists", async () => {
      const registerData = {
        email: "existing@example.com",
        password: "testPassword123!",
        name: "Existing User",
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.register(registerData);

      expect(result).toMatchObject({
        success: false,
        message: "User with this email already exists",
      });

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when registration fails", async () => {
      const registerData = {
        email: "newuser@example.com",
        password: "testPassword123!",
        name: "New User",
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockUserRepository.create.mockRejectedValue(new Error("Database error"));

      await expect(userService.register(registerData)).rejects.toThrow(
        "Registration failed"
      );
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "testPassword123!",
      };

      const accessToken = "access-token";

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwt.sign as jest.Mock).mockReturnValue(accessToken);

      const result = await userService.login(loginData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        loginData.email
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password
      );

      expect(result).toMatchObject({
        success: true,
        message: "Login successful",
        data: {
          user: {
            email: loginData.email,
            name: mockUser.name,
          },
          accessToken,
        },
      });
    });

    it("should fail login with non-existent user", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "testPassword123!",
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.login(loginData);

      expect(result).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should fail login with user without password (OAuth user)", async () => {
      const loginData = {
        email: "oauth@example.com",
        password: "testPassword123!",
      };

      const oauthUser = { ...mockUser, password: null };
      mockUserRepository.findByEmail.mockResolvedValue(oauthUser);

      const result = await userService.login(loginData);

      expect(result).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should fail login with incorrect password", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongPassword123!",
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await userService.login(loginData);

      expect(result).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should throw error when login fails", async () => {
      const loginData = {
        email: "test@example.com",
        password: "testPassword123!",
      };

      mockUserRepository.findByEmail.mockRejectedValue(
        new Error("Database error")
      );

      await expect(userService.login(loginData)).rejects.toThrow(
        "Login failed"
      );
    });
  });

  describe("getProfile", () => {
    it("should return user profile successfully", async () => {
      const userId = "user-1";

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getProfile(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toMatchObject({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            avatar: mockUser.avatar,
            provider: mockUser.provider,
          },
        },
      });
    });

    it("should fail when user not found", async () => {
      const userId = "non-existent-user";

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getProfile(userId);

      expect(result).toMatchObject({
        success: false,
        message: "User not found",
      });
    });

    it("should throw error when profile fetch fails", async () => {
      const userId = "user-1";

      mockUserRepository.findById.mockRejectedValue(
        new Error("Database error")
      );

      await expect(userService.getProfile(userId)).rejects.toThrow(
        "Failed to get user profile"
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      const userId = "user-1";
      const updateData = {
        name: "Updated Name",
        avatar: "new-avatar-url",
      };

      const updatedUser = {
        ...mockUser,
        name: updateData.name,
        avatar: updateData.avatar,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        name: updateData.name,
        avatar: updateData.avatar,
      });

      expect(result).toMatchObject({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            name: updateData.name,
            avatar: updateData.avatar,
          },
        },
      });
    });

    it("should update only provided fields", async () => {
      const userId = "user-1";
      const updateData = {
        name: "Updated Name Only",
      };

      const updatedUser = {
        ...mockUser,
        name: updateData.name,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateData);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        name: updateData.name,
        avatar: mockUser.avatar,
      });

      expect(result).toMatchObject({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            name: updateData.name,
          },
        },
      });
    });

    it("should fail when user not found", async () => {
      const userId = "non-existent-user";
      const updateData = { name: "New Name" };

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.updateProfile(userId, updateData);

      expect(result).toMatchObject({
        success: false,
        message: "User not found",
      });

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when update fails", async () => {
      const userId = "user-1";
      const updateData = { name: "New Name" };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockRejectedValue(new Error("Database error"));

      await expect(
        userService.updateProfile(userId, updateData)
      ).rejects.toThrow("Failed to update user profile");
    });
  });

  describe("handleGoogleOAuth", () => {
    it("should handle existing Google user", async () => {
      const googleUser = {
        googleId: "google-123",
        email: "google@example.com",
        name: "Google User",
        avatar: "google-avatar-url",
      };

      const existingGoogleUser = {
        ...mockUser,
        googleId: googleUser.googleId,
        email: googleUser.email,
        provider: "google",
      };

      mockUserRepository.findByGoogleId.mockResolvedValue(existingGoogleUser);

      const result = await userService.handleGoogleOAuth(googleUser);

      expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(
        googleUser.googleId
      );
      expect(result).toEqual(existingGoogleUser);
    });

    it("should link Google account to existing email user", async () => {
      const googleUser = {
        googleId: "google-123",
        email: "existing@example.com",
        name: "Google User",
        avatar: "google-avatar-url",
      };

      const existingEmailUser = {
        ...mockUser,
        email: googleUser.email,
        googleId: null,
        provider: "local",
      };

      const updatedUser = {
        ...existingEmailUser,
        name: googleUser.name,
        avatar: googleUser.avatar,
      };

      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(existingEmailUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.handleGoogleOAuth(googleUser);

      expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(
        googleUser.googleId
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        googleUser.email
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingEmailUser.id,
        {
          name: googleUser.name,
          avatar: googleUser.avatar,
        }
      );
      expect(result).toEqual(updatedUser);
    });

    it("should create new Google user", async () => {
      const googleUser = {
        googleId: "google-123",
        email: "newgoogle@example.com",
        name: "New Google User",
        avatar: "google-avatar-url",
      };

      const newGoogleUser = {
        ...mockUser,
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        provider: "google",
        avatar: googleUser.avatar,
      };

      mockUserRepository.findByGoogleId.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newGoogleUser);

      const result = await userService.handleGoogleOAuth(googleUser);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        provider: "google",
        avatar: googleUser.avatar,
      });
      expect(result).toEqual(newGoogleUser);
    });

    it("should throw error when Google OAuth handling fails", async () => {
      const googleUser = {
        googleId: "google-123",
        email: "error@example.com",
        name: "Error User",
        avatar: "error-avatar",
      };

      mockUserRepository.findByGoogleId.mockRejectedValue(
        new Error("Database error")
      );

      await expect(userService.handleGoogleOAuth(googleUser)).rejects.toThrow(
        "Google OAuth handling failed"
      );
    });
  });

  describe("logout", () => {
    it("should return success message for logout", async () => {
      const result = await userService.logout();

      expect(result).toMatchObject({
        success: true,
        message: "Logout successful",
      });
    });
  });
});
