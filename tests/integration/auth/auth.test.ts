/**
 * Authentication Integration Tests
 */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import App from "../../../src/app";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withTestCleanup, TestDataCleanup } from "../../utils/testCleanup";

const prisma = new PrismaClient();
const app = new App().app;

describe("Authentication Integration Tests", () => {
  let cleanup: TestDataCleanup;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    cleanup = new TestDataCleanup();
  });

  afterAll(async () => {
    await cleanup.cleanupAll();
    await cleanup.disconnect();
  });

  describe("POST /api/users/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: `test.register.${Date.now()}@example.com`,
        password: "TestPassword123!",
        name: "Test User",
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: "User registered successfully",
        data: {
          accessToken: expect.any(String),
          user: {
            email: expect.stringContaining("test.register."),
            name: "Test User",
            provider: "local",
            role: "USER",
          },
        },
      });

      // Track the user for cleanup
      cleanup.trackUser(response.body.data.user.id);
    });

    it("should reject registration with existing email", async () => {
      const userData = {
        email: `test.duplicate.${Date.now()}@example.com`,
        password: "TestPassword123!",
        name: "Test User",
      };

      // First registration should succeed
      const firstResponse = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      cleanup.trackUser(firstResponse.body.data.user.id);

      // Second registration with same email should fail
      const secondResponse = await request(app)
        .post("/api/users/register")
        .send({
          ...userData,
          name: "Another User",
        })
        .expect(409);

      expect(secondResponse.body).toMatchObject({
        success: false,
        message: "User with this email already exists",
      });
    });

    it("should reject registration with invalid email format", async () => {
      const userData = {
        email: "invalid-email",
        password: "TestPassword123!",
        name: "Test User",
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });

    it("should reject registration with weak password", async () => {
      const userData = {
        email: `test.weak.${Date.now()}@example.com`,
        password: "weak",
        name: "Test User",
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });

    it("should reject registration with missing fields", async () => {
      const userData = {
        email: `test.missing.${Date.now()}@example.com`,
        // Missing password and name
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });
  });

  describe("POST /api/users/login", () => {
    beforeAll(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash("TestPassword123!", 12);
      testUser = await prisma.user.create({
        data: {
          email: `test.login.${Date.now()}@example.com`,
          password: hashedPassword,
          name: "Login Test User",
          provider: "local",
        },
      });
      cleanup.trackUser(testUser.id);
    });

    it("should login successfully with valid credentials", async () => {
      const loginData = {
        email: testUser.email,
        password: "TestPassword123!",
      };

      const response = await request(app)
        .post("/api/users/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Login successful",
        data: {
          user: {
            email: loginData.email,
            name: "Login Test User",
          },
          accessToken: expect.any(String),
        },
      });

      // Store tokens for other tests
      accessToken = response.body.data.accessToken;
    });

    it("should reject login with invalid email", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "TestPassword123!",
      };

      const response = await request(app)
        .post("/api/users/login")
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should reject login with invalid password", async () => {
      const loginData = {
        email: testUser.email,
        password: "WrongPassword123!",
      };

      const response = await request(app)
        .post("/api/users/login")
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should reject login with validation errors", async () => {
      const loginData = {
        email: "invalid-email",
        password: "",
      };

      const response = await request(app)
        .post("/api/users/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });
  });

  describe("GET /api/users/profile", () => {
    it("should get user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testUser.email,
            name: testUser.name,
            provider: "local",
          },
        },
      });
    });

    it("should reject profile access without token", async () => {
      const response = await request(app).get("/api/users/profile").expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });

    it("should reject profile access with invalid token", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid or expired",
        },
      });
    });

    it("should reject profile access with malformed authorization header", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", "Basic invalid-header")
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });
  });

  describe("PUT /api/users/profile", () => {
    it("should update user profile with valid token", async () => {
      const updateData = {
        name: "Updated Test User",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            name: updateData.name,
          },
        },
      });
    });

    it("should reject profile update without token", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });

    it("should reject profile update with invalid token", async () => {
      const updateData = {
        name: "Updated Name",
      };

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", "Bearer invalid-token")
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid or expired",
        },
      });
    });

    it("should handle validation errors in profile update", async () => {
      const updateData = {
        name: "", // Empty name should be invalid
      };

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });
  });

  describe("PUT /api/users/change-password", () => {
    it("should change password with valid current password", async () => {
      const passwordData = {
        currentPassword: "TestPassword123!",
        newPassword: "NewTestPassword123!",
      };

      const response = await request(app)
        .put("/api/users/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Password changed successfully",
      });
    });

    it("should reject password change with invalid current password", async () => {
      const passwordData = {
        currentPassword: "WrongPassword123!",
        newPassword: "NewTestPassword123!",
      };

      const response = await request(app)
        .put("/api/users/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Current password is incorrect",
      });
    });

    it("should reject password change with weak new password", async () => {
      const passwordData = {
        currentPassword: "NewTestPassword123!", // This is now the current password
        newPassword: "weak",
      };

      const response = await request(app)
        .put("/api/users/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
        },
      });
    });

    it("should reject password change without token", async () => {
      const passwordData = {
        currentPassword: "TestPassword123!",
        newPassword: "NewTestPassword123!",
      };

      const response = await request(app)
        .put("/api/users/change-password")
        .send(passwordData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });
  });

  describe("POST /api/users/logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/users/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Logout successful",
      });
    });

    it("should handle logout without token gracefully", async () => {
      const response = await request(app).post("/api/users/logout").expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
    });
  });

  describe("User Service Integration", () => {
    it(
      "should handle user service operations",
      withTestCleanup(async (testCleanup) => {
        // Create test user
        const user = await testCleanup.getOrCreateTestUser(
          `test.userservice.${Date.now()}@example.com`
        );

        // Test user exists
        const foundUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        expect(foundUser).toBeTruthy();
        expect(foundUser?.email).toBe(user.email);
        expect(foundUser?.name).toContain("Test User");
      })
    );
  });
});
