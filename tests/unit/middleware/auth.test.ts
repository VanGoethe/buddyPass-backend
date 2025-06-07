/**
 * Authentication Middleware Unit Tests
 */

import { Request, Response, NextFunction } from "express";
import {
  authenticateJWT,
  optionalAuth,
  requireVerified,
  requireOwnership,
  authRateLimit,
  validateRequest,
} from "../../../src/middleware/auth";
import { IUserService, IUserRepository } from "../../../src/types/users";
import { UserRole } from "@prisma/client";

// Mock the container module
jest.mock("../../../src/container", () => ({
  container: {
    getUserService: jest.fn(),
    getUserRepository: jest.fn(),
  },
}));

// Mock the validationResult
jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

const mockValidationResult = require("express-validator").validationResult;

describe("Authentication Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockUserService: jest.Mocked<IUserService>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request mock
    mockReq = {
      headers: {},
      user: undefined,
      params: {},
      body: {},
      ip: "127.0.0.1",
    };

    // Setup response mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup next function mock
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

    // Setup service mocks
    mockUserService = {
      verifyAccessToken: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      handleGoogleOAuth: jest.fn(),
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
      generateAccessToken: jest.fn(),
      createAdmin: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    };

    // Mock the container functions to return our mocked services
    const { container } = require("../../../src/container");
    container.getUserService.mockReturnValue(mockUserService);
    container.getUserRepository.mockReturnValue(mockUserRepository);
  });

  describe("validateRequest", () => {
    it("should call next() when validation passes", () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 400 when validation fails", () => {
      const errors = [{ msg: "Email is required", param: "email" }];
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => errors,
      });

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: errors,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("authenticateJWT", () => {
    it("should authenticate valid token successfully", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue({
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserService.verifyAccessToken).toHaveBeenCalledWith(
        "valid-token"
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-1");
      expect(mockReq.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        avatar: mockUser.avatar,
        provider: mockUser.provider,
        isVerified: mockUser.isVerified,
        isActive: mockUser.isActive,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 when no authorization header", async () => {
      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header doesn't start with Bearer", async () => {
      mockReq.headers = {
        authorization: "Basic invalid-header",
      };

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });

    it("should return 401 when token is invalid", async () => {
      mockReq.headers = {
        authorization: "Bearer invalid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue(null);

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid or expired",
        },
      });
    });

    it("should return 401 when user not found", async () => {
      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue({
        userId: "non-existent-user",
        email: "test@example.com",
        role: UserRole.USER,
      });

      mockUserRepository.findById.mockResolvedValue(null);

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User associated with token not found",
        },
      });
    });

    it("should return 403 when user is inactive", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: false, // Inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue({
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "USER_INACTIVE",
          message: "User account is deactivated",
        },
      });
    });

    it("should handle authentication errors gracefully", async () => {
      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockImplementation(() => {
        throw new Error("Token verification failed");
      });

      await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication error occurred",
        },
      });
    });
  });

  describe("optionalAuth", () => {
    it("should proceed without authentication when no header", async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should authenticate when valid token provided", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue({
        userId: "user-1",
        email: "test@example.com",
        role: UserRole.USER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should proceed without user when token is invalid", async () => {
      mockReq.headers = {
        authorization: "Bearer invalid-token",
      };

      mockUserService.verifyAccessToken.mockReturnValue(null);

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should proceed without user when authentication throws error", async () => {
      mockReq.headers = {
        authorization: "Bearer valid-token",
      };

      mockUserService.verifyAccessToken.mockImplementation(() => {
        throw new Error("Token verification failed");
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("requireVerified", () => {
    it("should proceed when user is verified", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
      };

      requireVerified(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 401 when user not authenticated", () => {
      requireVerified(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_AUTHENTICATED",
          message: "Authentication required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not verified", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: false,
        isActive: true,
      };

      requireVerified(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email verification required to access this resource",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireOwnership", () => {
    it("should proceed when user owns the resource (params)", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
      };
      mockReq.params = { userId: "user-1" };

      requireOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should proceed when user owns the resource (body)", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
      };
      mockReq.body = { userId: "user-1" };

      requireOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should proceed when no userId in request", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
      };

      requireOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 401 when user not authenticated", () => {
      requireOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_AUTHENTICATED",
          message: "Authentication required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user doesn't own the resource", () => {
      mockReq.user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatar: null,
        provider: "local",
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
      };
      mockReq.params = { userId: "user-2" };

      requireOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "You don't have permission to access this resource",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("authRateLimit", () => {
    it("should allow requests under the limit", () => {
      const rateLimitMiddleware = authRateLimit(5, 60000);

      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should block requests over the limit", () => {
      const rateLimitMiddleware = authRateLimit(1, 60000);

      // First request should pass
      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Second request should be blocked
      jest.clearAllMocks();
      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many authentication attempts. Please try again later.",
          details: {
            retryAfter: expect.any(Number),
          },
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reset attempts after window expires", (done) => {
      const rateLimitMiddleware = authRateLimit(1, 100); // 100ms window

      // First request should pass
      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Wait for window to expire and test again
      setTimeout(() => {
        jest.clearAllMocks();
        rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        done();
      }, 150);
    });
  });
});
