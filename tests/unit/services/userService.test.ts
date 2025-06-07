/**
 * User Service Unit Tests
 */

import { UserService } from "../../../src/services/users";
import { IUserRepository, UserRole } from "../../../src/types/users";

// Mock user repository
const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByGoogleId: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh service instance
    userService = new UserService(mockUserRepository);
  });

  describe("createAdmin", () => {
    const validAdminData = {
      email: "admin@test.com",
      password: "AdminPass123!",
      name: "Test Admin",
    };

    it("should create admin user successfully", async () => {
      const hashedPassword = "hashedAdminPass123!";
      const mockCreatedUser = {
        id: "admin-123",
        email: validAdminData.email,
        name: validAdminData.name,
        role: UserRole.ADMIN,
        provider: "local",
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: hashedPassword,
        avatar: null,
        googleId: null,
        lastLoginAt: null,
      };

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Mock password hashing
      jest.spyOn(userService, "hashPassword").mockResolvedValue(hashedPassword);

      const result = await userService.createAdmin(validAdminData);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Admin user created successfully");
      expect(result.data.user.email).toBe(validAdminData.email);
      expect(result.data.user.name).toBe(validAdminData.name);
      expect(result.data.user.role).toBe("ADMIN");
      expect(result.data.user).not.toHaveProperty("password");

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validAdminData.email
      );
      expect(userService.hashPassword).toHaveBeenCalledWith(
        validAdminData.password
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: validAdminData.email,
        password: hashedPassword,
        name: validAdminData.name,
        provider: "local",
        role: UserRole.ADMIN,
      });
    });

    it("should reject creation if user with email already exists", async () => {
      const existingUser = {
        id: "existing-123",
        email: validAdminData.email,
        name: "Existing User",
        role: UserRole.USER,
        provider: "local",
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: "hashedpass",
        avatar: null,
        googleId: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      const result = await userService.createAdmin(validAdminData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("User with this email already exists");
      expect(result.data.user).toEqual({});

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validAdminData.email
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if repository create fails", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error("Database error"));

      // Mock password hashing
      jest.spyOn(userService, "hashPassword").mockResolvedValue("hashedpass");

      await expect(userService.createAdmin(validAdminData)).rejects.toThrow(
        "Admin creation failed"
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validAdminData.email
      );
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it("should properly convert user to response format", async () => {
      const mockCreatedUser = {
        id: "admin-123",
        email: validAdminData.email,
        name: validAdminData.name,
        role: UserRole.ADMIN,
        provider: "local",
        isActive: true,
        isVerified: false,
        createdAt: new Date("2025-06-04T21:21:49.000Z"),
        updatedAt: new Date("2025-06-04T21:21:49.000Z"),
        password: "hashedAdminPass123!",
        avatar: "https://example.com/avatar.jpg",
        googleId: null,
        lastLoginAt: new Date("2025-06-04T20:21:49.000Z"),
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);
      jest
        .spyOn(userService, "hashPassword")
        .mockResolvedValue("hashedAdminPass123!");

      const result = await userService.createAdmin(validAdminData);

      expect(result.data.user).toEqual({
        id: "admin-123",
        email: validAdminData.email,
        name: validAdminData.name,
        role: "ADMIN",
        avatar: "https://example.com/avatar.jpg",
        provider: "local",
        createdAt: new Date("2025-06-04T21:21:49.000Z"),
        updatedAt: new Date("2025-06-04T21:21:49.000Z"),
      });

      // Ensure sensitive data is not included
      expect(result.data.user).not.toHaveProperty("password");
      expect(result.data.user).not.toHaveProperty("googleId");
      expect(result.data.user).not.toHaveProperty("isActive");
      expect(result.data.user).not.toHaveProperty("isVerified");
      expect(result.data.user).not.toHaveProperty("lastLoginAt");
    });
  });

  describe("register", () => {
    const validUserData = {
      email: "user@test.com",
      password: "UserPass123!",
      name: "Test User",
    };

    it("should create regular user with USER role by default", async () => {
      const hashedPassword = "hashedUserPass123!";
      const mockCreatedUser = {
        id: "user-123",
        email: validUserData.email,
        name: validUserData.name,
        role: UserRole.USER,
        provider: "local",
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: hashedPassword,
        avatar: null,
        googleId: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);
      jest.spyOn(userService, "hashPassword").mockResolvedValue(hashedPassword);
      jest
        .spyOn(userService, "generateAccessToken")
        .mockReturnValue("mock-token");

      const result = await userService.register(validUserData);

      expect(result.success).toBe(true);
      expect(result.data.user.role).toBe("USER");
      expect(result.data.accessToken).toBe("mock-token");

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: validUserData.email,
        password: hashedPassword,
        name: validUserData.name,
        provider: "local",
        role: undefined, // Regular registration doesn't specify role
      });
    });
  });

  describe("password utilities", () => {
    it("should hash passwords correctly", async () => {
      const password = "TestPassword123!";

      // Since hashPassword is a real method, we test it directly
      const service = new UserService(mockUserRepository);
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it("should compare passwords correctly", async () => {
      const password = "TestPassword123!";

      const service = new UserService(mockUserRepository);
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.comparePassword(password, hashedPassword);
      const isInvalid = await service.comparePassword(
        "WrongPassword",
        hashedPassword
      );

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JWT token utilities", () => {
    it("should generate and verify access tokens", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: UserRole.USER,
      };

      const service = new UserService(mockUserRepository);
      const token = service.generateAccessToken(payload);
      const verifiedPayload = service.verifyAccessToken(token);

      expect(token).toBeDefined();
      // JWT adds exp and iat fields, so we check the core payload
      expect(verifiedPayload).toMatchObject(payload);
      expect(verifiedPayload).toHaveProperty("exp");
      expect(verifiedPayload).toHaveProperty("iat");
    });

    it("should return null for invalid tokens", () => {
      const service = new UserService(mockUserRepository);
      const verifiedPayload = service.verifyAccessToken("invalid-token");

      expect(verifiedPayload).toBeNull();
    });
  });

  describe("login", () => {
    const loginData = {
      email: "user@test.com",
      password: "UserPass123!",
    };

    it("should login user successfully with correct credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: loginData.email,
        name: "Test User",
        role: UserRole.USER,
        provider: "local",
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: "hashedPassword",
        avatar: null,
        googleId: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(userService, "comparePassword").mockResolvedValue(true);
      jest
        .spyOn(userService, "generateAccessToken")
        .mockReturnValue("access-token");

      const result = await userService.login(loginData);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(loginData.email);
      expect(result.data.accessToken).toBe("access-token");

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        loginData.email
      );
      expect(userService.comparePassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password
      );
      // Note: The current implementation doesn't update lastLoginAt
    });

    it("should reject login with invalid credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: loginData.email,
        name: "Test User",
        role: UserRole.USER,
        provider: "local",
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: "hashedPassword",
        avatar: null,
        googleId: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(userService, "comparePassword").mockResolvedValue(false);

      const result = await userService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email or password");

      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("should reject login for non-existent user", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email or password");
    });

    it("should reject login for user without password (OAuth user)", async () => {
      const oauthUser = {
        id: "user-123",
        email: loginData.email,
        name: "Test User",
        role: UserRole.USER,
        provider: "google",
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: null, // OAuth user has no password
        avatar: null,
        googleId: "google123",
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(oauthUser);

      const result = await userService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email or password");
    });
  });
});
