/**
 * Admin Users Endpoint Integration Tests
 */

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { UserRole } from "../../../src/types/users";
import { UserService } from "../../../src/services/users";
import { PrismaUserRepository } from "../../../src/repositories/users";
import App from "../../../src/app";

describe("Admin Users Endpoints", () => {
  let prisma: PrismaClient;
  let userService: UserService;
  let adminToken: string;
  let regularUserToken: string;
  let app: any;

  beforeAll(async () => {
    // Create app instance
    const appInstance = new App();
    app = appInstance.app;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            "postgresql://test:test@localhost:5432/buddypass_test",
        },
      },
    });

    const userRepository = new PrismaUserRepository(prisma);
    userService = new UserService(userRepository);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.user.deleteMany();

    // Create test admin user
    const adminUser = await userService.register({
      email: "admin@test.com",
      password: "AdminPass123!",
      name: "Test Admin",
    });

    // Update user role to admin
    await prisma.user.update({
      where: { id: adminUser.data.user.id },
      data: { role: UserRole.ADMIN },
    });

    // Generate admin token
    adminToken = userService.generateAccessToken({
      userId: adminUser.data.user.id,
      email: adminUser.data.user.email,
      role: UserRole.ADMIN,
    });

    // Create test regular user
    const regularUser = await userService.register({
      email: "user@test.com",
      password: "UserPass123!",
      name: "Test User",
    });

    // Generate regular user token
    regularUserToken = userService.generateAccessToken({
      userId: regularUser.data.user.id,
      email: regularUser.data.user.email,
      role: UserRole.USER,
    });

    // Create additional test users for list testing
    await prisma.user.createMany({
      data: [
        {
          email: "user1@test.com",
          name: "User 1",
          password: "hashedpassword1",
          provider: "local",
          role: UserRole.USER,
          isActive: true,
          isVerified: true,
        },
        {
          email: "user2@test.com",
          name: "User 2",
          password: "hashedpassword2",
          provider: "local",
          role: UserRole.USER,
          isActive: false,
          isVerified: false,
        },
        {
          email: "admin2@test.com",
          name: "Admin 2",
          password: "hashedpassword3",
          provider: "local",
          role: UserRole.ADMIN,
          isActive: true,
          isVerified: true,
        },
      ],
    });
  });

  describe("GET /api/admin/users", () => {
    it("should return all users for admin", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.users.length).toBe(5); // 2 created in beforeEach + 3 in data
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.totalPages).toBe(1);

      // Verify user data structure
      const user = response.body.data.users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("isActive");
      expect(user).toHaveProperty("isVerified");
      expect(user).toHaveProperty("provider");
      expect(user).toHaveProperty("createdAt");
      expect(user).not.toHaveProperty("password"); // Should not include sensitive data
    });

    it("should paginate users correctly", async () => {
      // Test first page
      const page1Response = await request(app)
        .get("/api/admin/users?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(page1Response.body.data.users.length).toBe(2);
      expect(page1Response.body.data.pagination.page).toBe(1);
      expect(page1Response.body.data.pagination.limit).toBe(2);
      expect(page1Response.body.data.pagination.total).toBe(5);
      expect(page1Response.body.data.pagination.totalPages).toBe(3);

      // Test second page
      const page2Response = await request(app)
        .get("/api/admin/users?page=2&limit=2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(page2Response.body.data.users.length).toBe(2);
      expect(page2Response.body.data.pagination.page).toBe(2);

      // Test third page
      const page3Response = await request(app)
        .get("/api/admin/users?page=3&limit=2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(page3Response.body.data.users.length).toBe(1);
      expect(page3Response.body.data.pagination.page).toBe(3);

      // Ensure no duplicate users across pages
      const allUsers = [
        ...page1Response.body.data.users,
        ...page2Response.body.data.users,
        ...page3Response.body.data.users,
      ];
      const uniqueEmails = new Set(allUsers.map((u) => u.email));
      expect(uniqueEmails.size).toBe(5);
    });

    it("should filter users by role", async () => {
      // Filter for admin users
      const adminResponse = await request(app)
        .get("/api/admin/users?role=ADMIN")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.data.users.length).toBe(2);
      adminResponse.body.data.users.forEach((user: any) => {
        expect(user.role).toBe("ADMIN");
      });

      // Filter for regular users
      const userResponse = await request(app)
        .get("/api/admin/users?role=USER")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(userResponse.body.data.users.length).toBe(3);
      userResponse.body.data.users.forEach((user: any) => {
        expect(user.role).toBe("USER");
      });
    });

    it("should filter users by status", async () => {
      // Filter for active users
      const activeResponse = await request(app)
        .get("/api/admin/users?status=active")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(activeResponse.body.data.users.length).toBe(4);
      activeResponse.body.data.users.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });

      // Filter for inactive users
      const inactiveResponse = await request(app)
        .get("/api/admin/users?status=inactive")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveResponse.body.data.users.length).toBe(1);
      inactiveResponse.body.data.users.forEach((user: any) => {
        expect(user.isActive).toBe(false);
      });
    });

    it("should combine role and status filters", async () => {
      const response = await request(app)
        .get("/api/admin/users?role=USER&status=active")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(2);
      response.body.data.users.forEach((user: any) => {
        expect(user.role).toBe("USER");
        expect(user.isActive).toBe(true);
      });
    });

    it("should limit page size to maximum of 100", async () => {
      const response = await request(app)
        .get("/api/admin/users?limit=150")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(100);
    });

    it("should deny access to non-admin users", async () => {
      await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      await request(app).get("/api/admin/users").expect(401);
    });

    it("should handle invalid query parameters gracefully", async () => {
      const response = await request(app)
        .get(
          "/api/admin/users?page=invalid&limit=invalid&role=INVALID&status=all"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1); // Default page
      expect(response.body.data.pagination.limit).toBe(10); // Default limit
      expect(response.body.data.users.length).toBe(5); // All users (invalid filters ignored)
    });

    it("should return empty array when no users match filters", async () => {
      const response = await request(app)
        .get("/api/admin/users?role=USER&status=inactive&page=10")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(0);
      expect(response.body.data.pagination.total).toBe(1); // Only one inactive user
      expect(response.body.data.pagination.totalPages).toBe(1);
    });
  });

  describe("GET /api/admin/dashboard", () => {
    it("should return dashboard statistics for admin", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.totalUsers).toBe(5);
      expect(response.body.data.statistics.totalSubscriptions).toBeDefined();
      expect(response.body.data.statistics.totalServiceProviders).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it("should deny access to non-admin users", async () => {
      await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      await request(app).get("/api/admin/dashboard").expect(401);
    });
  });

  describe("POST /api/admin/users", () => {
    it("should create admin user successfully", async () => {
      const newAdminData = {
        email: "newadmin@test.com",
        password: "NewAdminPass123!",
        name: "New Admin",
      };

      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newAdminData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Admin user created successfully");
      expect(response.body.data.user.email).toBe(newAdminData.email);
      expect(response.body.data.user.name).toBe(newAdminData.name);
      expect(response.body.data.user.role).toBe("ADMIN");
      expect(response.body.data.user).not.toHaveProperty("password");

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { email: newAdminData.email },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser!.role).toBe(UserRole.ADMIN);
    });

    it("should reject duplicate email", async () => {
      const duplicateAdminData = {
        email: "admin@test.com", // Already exists
        password: "DuplicatePass123!",
        name: "Duplicate Admin",
      };

      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateAdminData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "weak",
        name: "A",
      };

      await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should deny access to non-admin users", async () => {
      const newAdminData = {
        email: "newadmin@test.com",
        password: "NewAdminPass123!",
        name: "New Admin",
      };

      await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(newAdminData)
        .expect(403);
    });
  });

  describe("PUT /api/admin/users/:userId/status", () => {
    let testUserId: string;

    beforeEach(async () => {
      const testUser = await prisma.user.findFirst({
        where: { email: "user1@test.com" },
      });
      testUserId = testUser!.id;
    });

    it("should update user status successfully", async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deactivated successfully");
      expect(response.body.data.user.isActive).toBe(false);

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser!.isActive).toBe(false);
    });

    it("should prevent admin from deactivating themselves", async () => {
      const adminUser = await prisma.user.findFirst({
        where: { email: "admin@test.com" },
      });

      const response = await request(app)
        .put(`/api/admin/users/${adminUser!.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("SELF_DEACTIVATION_ERROR");
    });

    it("should deny access to non-admin users", async () => {
      await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it("should validate isActive field", async () => {
      await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: "invalid" })
        .expect(400);
    });
  });
});
