/**
 * Admin Users Endpoint Integration Tests
 */

import request from "supertest";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import App from "../../../src/app";
import { TestDataCleanup, withTestCleanup } from "../../utils/testCleanup";
import { container } from "../../../src/container";

const prisma = new PrismaClient();
const app = new App().app;

describe("Admin Users Endpoints", () => {
  let cleanup: TestDataCleanup;
  let adminToken: string;
  let regularUserToken: string;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    cleanup = new TestDataCleanup();

    // Create admin user
    const hashedPassword = await bcrypt.hash("AdminPassword123!", 12);
    adminUser = await prisma.user.create({
      data: {
        email: `admin.${Date.now()}@test.com`,
        name: "Admin User",
        password: hashedPassword,
        provider: "local",
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
      },
    });
    cleanup.trackUser(adminUser.id);

    // Create regular user
    regularUser = await prisma.user.create({
      data: {
        email: `user.${Date.now()}@test.com`,
        name: "Regular User",
        password: hashedPassword,
        provider: "local",
        role: UserRole.USER,
        isActive: true,
        isVerified: true,
      },
    });
    cleanup.trackUser(regularUser.id);

    // Generate tokens
    const userService = container.getUserService();
    adminToken = userService.generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    regularUserToken = userService.generateAccessToken({
      userId: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    });
  });

  afterAll(async () => {
    await cleanup.cleanupAll();
    await cleanup.disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test users to ensure clean state
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "testuser",
        },
      },
    });

    // Create fresh test users for each test
    await prisma.user.createMany({
      data: [
        {
          email: "testuser1@test.com",
          name: "Test User 1",
          password: "hashedpassword1",
          provider: "local",
          role: UserRole.USER,
          isActive: true,
          isVerified: true,
        },
        {
          email: "testuser2@test.com",
          name: "Test User 2",
          password: "hashedpassword2",
          provider: "local",
          role: UserRole.USER,
          isActive: false,
          isVerified: true,
        },
        {
          email: "testuser3@test.com",
          name: "Test User 3",
          password: "hashedpassword3",
          provider: "local",
          role: UserRole.ADMIN,
          isActive: true,
          isVerified: true,
        },
      ],
    });
  });

  afterEach(async () => {
    // Clean up test users after each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "testuser",
        },
      },
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
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(5); // At least the test users we create
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(5);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.totalPages).toBeGreaterThanOrEqual(
        1
      );

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
      expect(page1Response.body.data.pagination.total).toBeGreaterThanOrEqual(
        5
      );
      expect(
        page1Response.body.data.pagination.totalPages
      ).toBeGreaterThanOrEqual(3);

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

      expect(page3Response.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(page3Response.body.data.pagination.page).toBe(3);

      // Ensure no duplicate users across pages
      const allUsers = [
        ...page1Response.body.data.users,
        ...page2Response.body.data.users,
        ...page3Response.body.data.users,
      ];
      const uniqueEmails = new Set(allUsers.map((u) => u.email));
      // At minimum we should have unique emails for our test data
      expect(uniqueEmails.size).toBeGreaterThanOrEqual(5);
    });

    it("should filter users by role", async () => {
      // Filter for admin users
      const adminResponse = await request(app)
        .get("/api/admin/users?role=ADMIN")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.data.users.length).toBeGreaterThanOrEqual(2);
      adminResponse.body.data.users.forEach((user: any) => {
        expect(user.role).toBe("ADMIN");
      });

      // Filter for regular users
      const userResponse = await request(app)
        .get("/api/admin/users?role=USER")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(userResponse.body.data.users.length).toBeGreaterThanOrEqual(3);
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

      expect(activeResponse.body.data.users.length).toBeGreaterThanOrEqual(4);
      activeResponse.body.data.users.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });

      // Filter for inactive users
      const inactiveResponse = await request(app)
        .get("/api/admin/users?status=inactive")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveResponse.body.data.users.length).toBeGreaterThanOrEqual(1);
      inactiveResponse.body.data.users.forEach((user: any) => {
        expect(user.isActive).toBe(false);
      });
    });

    it("should combine role and status filters", async () => {
      const response = await request(app)
        .get("/api/admin/users?role=USER&status=active")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
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
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(5); // All users (invalid filters ignored)
    });

    it("should return empty array when no users match filters", async () => {
      const response = await request(app)
        .get("/api/admin/users?role=USER&status=inactive&page=10")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users.length).toBe(0);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(1); // At least one inactive user
      expect(response.body.data.pagination.totalPages).toBeGreaterThanOrEqual(
        1
      );
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
      expect(response.body.data.statistics.totalUsers).toBeGreaterThanOrEqual(
        5
      );
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

  describe("GET /api/admin/users/:userId", () => {
    it(
      "should get individual user details successfully",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser("test@example.com");

        const response = await request(app)
          .get(`/api/admin/users/${testUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.id).toBe(testUser.id);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.user.name).toBe(testUser.name);
        expect(response.body.data.user.role).toBe(testUser.role);
        expect(response.body.data.user.isActive).toBeDefined();
        expect(response.body.data.user.isVerified).toBeDefined();
        expect(response.body.data.user.provider).toBeDefined();
        expect(response.body.data.user.avatar).toBeDefined();
        expect(response.body.data.user.createdAt).toBeDefined();
        expect(response.body.data.user.updatedAt).toBeDefined();
        expect(response.body.data.user.lastLoginAt).toBeDefined();

        // Should not expose sensitive data
        expect(response.body.data.user).not.toHaveProperty("password");
        expect(response.body.data.user).not.toHaveProperty("googleId");
      })
    );

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "cm4nonexistent123456";

      const response = await request(app)
        .get(`/api/admin/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
      expect(response.body.error.message).toBe("User not found");
    });

    it("should deny access to non-admin users", async () => {
      await request(app)
        .get(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      await request(app).get(`/api/admin/users/${regularUser.id}`).expect(401);
    });
  });

  describe("PUT /api/admin/users/:userId", () => {
    it(
      "should update user information successfully",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "updatetest@example.com"
        );

        const updateData = {
          name: "Updated User Name",
          avatar: "https://example.com/new-avatar.jpg",
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "User information updated successfully"
        );
        expect(response.body.data.user.name).toBe("Updated User Name");
        expect(response.body.data.user.avatar).toBe(
          "https://example.com/new-avatar.jpg"
        );
        expect(response.body.data.user.id).toBe(testUser.id);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.user.role).toBe(testUser.role);
      })
    );

    it(
      "should update only name when avatar not provided",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "nameonly@example.com"
        );

        const updateData = {
          name: "Only Name Updated",
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe("Only Name Updated");
        expect(response.body.data.user.avatar).toBe(testUser.avatar);
      })
    );

    it(
      "should update only avatar when name not provided",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "avataronly@example.com"
        );

        const updateData = {
          avatar: "https://example.com/avatar-only.jpg",
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe(testUser.name);
        expect(response.body.data.user.avatar).toBe(
          "https://example.com/avatar-only.jpg"
        );
      })
    );

    it("should return 400 when no update data provided", async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NO_UPDATE_DATA");
      expect(response.body.error.message).toBe("No valid update data provided");
    });

    it("should return 400 for invalid name length", async () => {
      const updateData = {
        name: "A", // Too short
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid avatar URL", async () => {
      const updateData = {
        avatar: "not-a-valid-url",
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "cm4nonexistent123456";
      const updateData = {
        name: "Updated Name",
      };

      const response = await request(app)
        .put(`/api/admin/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should deny access to non-admin users", async () => {
      const updateData = {
        name: "Updated Name",
      };

      await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(updateData)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      const updateData = {
        name: "Updated Name",
      };

      await request(app)
        .put(`/api/admin/users/${regularUser.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe("PUT /api/admin/users/:userId/role", () => {
    it(
      "should update user role successfully",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "roletest@example.com"
        );

        const updateData = {
          role: "ADMIN",
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser.id}/role`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "User role updated to ADMIN successfully"
        );
        expect(response.body.data.user.role).toBe("ADMIN");
        expect(response.body.data.user.id).toBe(testUser.id);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.user.name).toBe(testUser.name);
      })
    );

    it(
      "should update role from ADMIN to USER",
      withTestCleanup(async (cleanup) => {
        // Create an admin user first
        const adminTestUser = await prisma.user.create({
          data: {
            email: `admin-demote-test-${Date.now()}@test.com`,
            name: "Admin to Demote",
            password: "hashedpassword",
            provider: "local",
            role: UserRole.ADMIN,
            isActive: true,
            isVerified: true,
          },
        });
        cleanup.trackUser(adminTestUser.id);

        const updateData = {
          role: "USER",
        };

        const response = await request(app)
          .put(`/api/admin/users/${adminTestUser.id}/role`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "User role updated to USER successfully"
        );
        expect(response.body.data.user.role).toBe("USER");
      })
    );

    it("should prevent admin from changing their own role", async () => {
      const updateData = {
        role: "USER",
      };

      const response = await request(app)
        .put(`/api/admin/users/${adminUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("SELF_ROLE_CHANGE_ERROR");
      expect(response.body.error.message).toBe("Cannot change your own role");
    });

    it("should return 400 for invalid role", async () => {
      const updateData = {
        role: "INVALID_ROLE",
      };

      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when role is missing", async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "cm4nonexistent123456";
      const updateData = {
        role: "ADMIN",
      };

      const response = await request(app)
        .put(`/api/admin/users/${nonExistentId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should deny access to non-admin users", async () => {
      const updateData = {
        role: "ADMIN",
      };

      await request(app)
        .put(`/api/admin/users/${regularUser.id}/role`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(updateData)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      const updateData = {
        role: "ADMIN",
      };

      await request(app)
        .put(`/api/admin/users/${regularUser.id}/role`)
        .send(updateData)
        .expect(401);
    });
  });

  describe("PUT /api/admin/users/:userId/status", () => {
    it(
      "should update user status successfully",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "statustest@example.com"
        );

        const updateData = {
          isActive: false,
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser.id}/status`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("User deactivated successfully");
        expect(response.body.data.user.isActive).toBe(false);
        expect(response.body.data.user.id).toBe(testUser.id);
      })
    );

    it("should prevent admin from deactivating themselves", async () => {
      const updateData = {
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/admin/users/${adminUser.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("SELF_DEACTIVATION_ERROR");
      expect(response.body.error.message).toBe(
        "Cannot deactivate your own account"
      );
    });
  });

  describe("DELETE /api/admin/users/:userId", () => {
    it(
      "should delete user successfully",
      withTestCleanup(async (cleanup) => {
        const testUser = await cleanup.getOrCreateTestUser(
          "deletetest@example.com"
        );
        const userId = testUser.id;

        const response = await request(app)
          .delete(`/api/admin/users/${userId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("User account deleted successfully");

        // Verify user is actually deleted
        const deletedUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        expect(deletedUser).toBeNull();

        // Don't track this user for cleanup since it's already deleted
      })
    );

    it("should prevent admin from deleting themselves", async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("SELF_DELETION_ERROR");
      expect(response.body.error.message).toBe(
        "Cannot delete your own account"
      );

      // Verify admin user still exists
      const adminUserStillExists = await prisma.user.findUnique({
        where: { id: adminUser.id },
      });
      expect(adminUserStillExists).not.toBeNull();
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "cm4nonexistent123456";

      const response = await request(app)
        .delete(`/api/admin/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
      expect(response.body.error.message).toBe("User not found");
    });

    it("should deny access to non-admin users", async () => {
      await request(app)
        .delete(`/api/admin/users/${regularUser.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it("should deny access to unauthenticated requests", async () => {
      await request(app)
        .delete(`/api/admin/users/${regularUser.id}`)
        .expect(401);
    });
  });
});
