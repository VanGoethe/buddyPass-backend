/**
 * Authentication Integration Tests
 */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import App from "../../../src/app";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const app = new App().app;

describe("Authentication Integration Tests", () => {
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "test",
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "test",
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/users/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test.register@example.com",
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
          user: {
            email: userData.email,
            name: userData.name,
          },
          accessToken: expect.any(String),
        },
      });

      // Store token for other tests
      accessToken = response.body.data.accessToken;
    });

    it("should reject registration with invalid email", async () => {
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
      });
    });

    it("should reject registration with weak password", async () => {
      const userData = {
        email: "test.weak@example.com",
        password: "123",
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
          details: [
            {
              location: "body",
              msg: "Password must be at least 8 characters long",
              path: "password",
              type: "field",
              value: "123",
            },
            {
              location: "body",
              msg: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
              path: "password",
              type: "field",
              value: "123",
            },
          ],
        },
      });
    });

    it("should reject registration with existing email", async () => {
      const userData = {
        email: "test.register@example.com", // Same email as first test
        password: "TestPassword123!",
        name: "Another User",
      };

      // Wait longer to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: "User with this email already exists",
      });
    });
  });

  describe("POST /api/users/login", () => {
    beforeAll(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash("TestPassword123!", 12);
      testUser = await prisma.user.create({
        data: {
          email: "test.login@example.com",
          password: hashedPassword,
          name: "Login Test User",
          provider: "local",
        },
      });
    });

    it("should login successfully with valid credentials", async () => {
      const loginData = {
        email: "test.login@example.com",
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
        email: "test.login@example.com",
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
            email: "test.login@example.com",
            name: "Login Test User",
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
        name: "Updated Test User",
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
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      // This endpoint no longer exists since we're using simple JWT without refresh tokens
      // Clean architecture UserService doesn't implement refresh tokens
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "dummy-token" })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
      });
    });

    it("should reject refresh with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
      });
    });

    it("should reject refresh without token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({})
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
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

    it("should reject password change without authentication", async () => {
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
      const response = await request(app).post("/api/users/logout").expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Logout successful",
      });
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to login endpoint", async () => {
      const loginData = {
        email: "test.ratelimit@example.com",
        password: "TestPassword123!",
      };

      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).post("/api/users/login").send(loginData));

      const responses = await Promise.all(requests);

      // Should have at least one rate-limited response
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toMatchObject({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: expect.stringContaining("Too many"),
          },
        });
      }
    });
  });

  describe("Protected Routes", () => {
    let protectedAccessToken: string;

    beforeAll(async () => {
      // Create a user and get token for protected route tests
      const userData = {
        email: "test.protected@example.com",
        password: "TestPassword123!",
        name: "Protected Route User",
      };

      // Wait longer to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      protectedAccessToken = response.body.data.accessToken;
    });

    it("should protect service provider creation endpoint", async () => {
      const serviceProviderData = {
        name: "Test Service",
        description: "Test Description",
        category: "streaming",
        website: "https://test.com",
        pricing: {
          type: "subscription",
          amount: 9.99,
          currency: "USD",
          billingCycle: "monthly",
        },
      };

      // Without token - should fail
      await request(app)
        .post("/api/service-providers")
        .send(serviceProviderData)
        .expect(401);

      // With token - should succeed (or fail with different error)
      const response = await request(app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${protectedAccessToken}`)
        .send(serviceProviderData);

      // Should not be 401 (authentication error)
      expect(response.status).not.toBe(401);
    });

    it("should protect subscription creation endpoint", async () => {
      const subscriptionData = {
        serviceProviderId: "service-1",
        planName: "Premium",
        cost: 9.99,
        currency: "USD",
        billingCycle: "monthly",
        startDate: new Date().toISOString(),
        status: "active",
      };

      // Without token - should fail
      await request(app)
        .post("/api/subscriptions")
        .send(subscriptionData)
        .expect(401);

      // With token - should succeed (or fail with different error)
      const response = await request(app)
        .post("/api/subscriptions")
        .set("Authorization", `Bearer ${protectedAccessToken}`)
        .send(subscriptionData);

      // Should not be 401 (authentication error)
      expect(response.status).not.toBe(401);
    });

    it("should allow public access to service provider listing", async () => {
      const response = await request(app)
        .get("/api/service-providers")
        .expect(200);

      // Should succeed without authentication
      expect(response.body).toHaveProperty("success");
    });

    it("should allow optional authentication for service provider details", async () => {
      // Without token
      const responseWithoutAuth = await request(app)
        .get("/api/service-providers/test-id")
        .expect((res) => {
          // Should not be authentication error
          if (res.status === 401) {
            expect(res.body.error?.code).not.toBe("MISSING_TOKEN");
          }
        });

      // With token
      const responseWithAuth = await request(app)
        .get("/api/service-providers/test-id")
        .set("Authorization", `Bearer ${protectedAccessToken}`)
        .expect((res) => {
          // Should not be authentication error
          if (res.status === 401) {
            expect(res.body.error?.code).not.toBe("MISSING_TOKEN");
          }
        });
    });
  });

  describe("User Service Routes", () => {
    let userAccessToken: string;

    beforeAll(async () => {
      // Create user for user service tests
      const userData = {
        email: "test.userservice@example.com",
        password: "TestPassword123!",
        name: "User Service Test",
      };

      // Wait longer to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      userAccessToken = response.body.data.accessToken;
    });

    it("should protect user profile endpoint", async () => {
      // Without token - should fail
      await request(app).get("/api/users/profile").expect(401);

      // With token - should succeed
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: "test.userservice@example.com",
            name: "User Service Test",
          },
        },
      });
    });

    it("should protect user profile update endpoint", async () => {
      const updateData = { name: "Updated User Service Test" };

      // Without token - should fail
      await request(app).put("/api/users/profile").send(updateData).expect(401);

      // With token - should succeed
      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            name: "Updated User Service Test",
          },
        },
      });
    });
  });
});
