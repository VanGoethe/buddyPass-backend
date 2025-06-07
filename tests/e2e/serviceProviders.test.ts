/**
 * ServiceProvider E2E Tests
 */

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import App from "../../src/app";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const app = new App();

// Test user data
const testUser = {
  id: "user_test_123",
  email: "test@serviceProvider.com",
  name: "Test User",
  role: "ADMIN" as const,
  isVerified: true,
  isActive: true,
};

// Generate test JWT token
const generateTestToken = (userData = testUser) => {
  return jwt.sign(
    {
      userId: userData.id,
      email: userData.email,
      user: JSON.stringify({ id: userData.id }),
    },
    process.env.JWT_SECRET || "test-secret",
    { expiresIn: "1h" }
  );
};

describe("ServiceProvider E2E Tests", () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test user if not exists
    try {
      await prisma.user.upsert({
        where: { id: testUser.id },
        update: testUser,
        create: testUser,
      });
    } catch (error) {
      console.log("Test user already exists or creation failed");
    }

    authToken = generateTestToken();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.serviceProvider.deleteMany({});
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    } catch (error) {
      console.log("Cleanup failed:", error);
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up ALL service providers before each test to ensure clean state
    await prisma.serviceProvider.deleteMany({});
  });

  describe("POST /api/service-providers", () => {
    it("should create a service provider successfully with metadata", async () => {
      const serviceProviderData = {
        name: "Test Disney+",
        description:
          "Disney streaming service with movies, shows, and original content",
        metadata: {
          category: "Entertainment",
          supportedCountries: ["US", "CA", "UK", "AU"],
          maxSlots: 4,
          website: "https://disneyplus.com",
          subscriptionTypes: ["Monthly", "Annual"],
        },
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          serviceProvider: {
            id: expect.any(String),
            name: "Test Disney+",
            description:
              "Disney streaming service with movies, shows, and original content",
            metadata: {
              category: "Entertainment",
              supportedCountries: ["US", "CA", "UK", "AU"],
              maxSlots: 4,
              website: "https://disneyplus.com",
              subscriptionTypes: ["Monthly", "Annual"],
            },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        },
        message: "Service provider created successfully",
      });
    });

    it("should create a service provider with minimal data", async () => {
      const serviceProviderData = {
        name: "Test Netflix Minimal",
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.name).toBe(
        "Test Netflix Minimal"
      );
      expect(response.body.data.serviceProvider.description).toBeNull();
      expect(response.body.data.serviceProvider.metadata).toBeNull();
    });

    it("should handle complex nested metadata", async () => {
      const serviceProviderData = {
        name: "Test Complex Metadata",
        description: "Service with complex metadata",
        metadata: {
          features: {
            video: {
              maxResolution: "4K",
              hdr: true,
              codecs: ["H.264", "H.265", "AV1"],
            },
            audio: {
              maxChannels: 7.1,
              codecs: ["AAC", "Dolby Atmos"],
            },
          },
          pricing: {
            tiers: [
              { name: "Basic", price: 8.99, currency: "USD" },
              { name: "Premium", price: 15.99, currency: "USD" },
            ],
          },
          regions: {
            available: ["US", "CA", "EU"],
            restricted: ["CN", "RU"],
          },
        },
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.metadata).toEqual(
        serviceProviderData.metadata
      );
    });

    it("should return 400 for missing name", async () => {
      const serviceProviderData = {
        description: "Service without name",
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Name is required",
            path: "name",
          }),
        ])
      );
    });

    it("should return 400 for name too long", async () => {
      const serviceProviderData = {
        name: "a".repeat(101),
        description: "Service with name too long",
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Name must be 100 characters or less",
            path: "name",
          }),
        ])
      );
    });

    it("should return 400 for description too long", async () => {
      const serviceProviderData = {
        name: "Test Service",
        description: "a".repeat(501),
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Description must be 500 characters or less",
            path: "description",
          }),
        ])
      );
    });

    it("should return 409 for duplicate name", async () => {
      const serviceProviderData = {
        name: "Test Duplicate",
        description: "First service provider",
      };

      // Create first service provider
      await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("CONFLICT");
      expect(response.body.error.message).toContain("already exists");
    });

    it("should return 401 for missing authorization", async () => {
      const serviceProviderData = {
        name: "Test Unauthorized",
        description: "Service without auth",
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .send(serviceProviderData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 401 for invalid token", async () => {
      const serviceProviderData = {
        name: "Test Invalid Token",
        description: "Service with invalid auth",
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", "Bearer invalid-token")
        .send(serviceProviderData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("GET /api/service-providers", () => {
    beforeEach(async () => {
      // Create test service providers
      await prisma.serviceProvider.createMany({
        data: [
          {
            name: "Test Netflix",
            description: "Streaming service",
            metadata: { category: "Entertainment" },
          },
          {
            name: "Test Spotify",
            description: "Music streaming",
            metadata: { category: "Music" },
          },
          {
            name: "Test Adobe",
            description: "Creative software",
            metadata: { category: "Software" },
          },
        ],
      });
    });

    it("should get service providers with pagination", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.hasNext).toBe(true);
      expect(response.body.data.hasPrevious).toBe(false);
    });

    it("should search service providers", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?search=Netflix")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(1);
      expect(response.body.data.serviceProviders[0].name).toBe("Test Netflix");
    });

    it("should sort service providers", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?sortBy=name&sortOrder=asc")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const names = response.body.data.serviceProviders.map(
        (sp: any) => sp.name
      );
      expect(names).toEqual(["Test Adobe", "Test Netflix", "Test Spotify"]);
    });
  });

  describe("GET /api/service-providers/:id", () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          name: "Test Single Provider",
          description: "Single provider for testing",
          metadata: { category: "Test" },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it("should get service provider by ID", async () => {
      const response = await request(app.app)
        .get(`/api/service-providers/${serviceProviderId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.id).toBe(serviceProviderId);
      expect(response.body.data.serviceProvider.name).toBe(
        "Test Single Provider"
      );
    });

    it("should return 404 for non-existent service provider", async () => {
      const response = await request(app.app)
        .get("/api/service-providers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /api/service-providers/:id", () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          name: "Test Update Provider",
          description: "Provider for update testing",
          metadata: { category: "Test" },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it("should update service provider successfully", async () => {
      const updateData = {
        name: "Test Updated Provider",
        description: "Updated description",
        metadata: {
          category: "Updated",
          features: ["new-feature"],
        },
      };

      const response = await request(app.app)
        .put(`/api/service-providers/${serviceProviderId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.name).toBe(
        "Test Updated Provider"
      );
      expect(response.body.data.serviceProvider.description).toBe(
        "Updated description"
      );
      expect(response.body.data.serviceProvider.metadata).toEqual({
        category: "Updated",
        features: ["new-feature"],
      });
    });

    it("should return 404 for non-existent service provider", async () => {
      const updateData = {
        name: "Test Non-existent Update",
      };

      const response = await request(app.app)
        .put("/api/service-providers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/service-providers/:id", () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          name: "Test Delete Provider",
          description: "Provider for delete testing",
          metadata: { category: "Test" },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it("should delete service provider successfully", async () => {
      const response = await request(app.app)
        .delete(`/api/service-providers/${serviceProviderId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Service provider deleted successfully"
      );

      // Verify deletion
      const deletedProvider = await prisma.serviceProvider.findUnique({
        where: { id: serviceProviderId },
      });
      expect(deletedProvider).toBeNull();
    });

    it("should return 404 for non-existent service provider", async () => {
      const response = await request(app.app)
        .delete("/api/service-providers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Metadata Edge Cases", () => {
    it("should handle null metadata", async () => {
      const serviceProviderData = {
        name: "Test Null Metadata",
        metadata: null,
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.metadata).toBeNull();
    });

    it("should handle empty metadata object", async () => {
      const serviceProviderData = {
        name: "Test Empty Metadata",
        metadata: {},
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.metadata).toEqual({});
    });

    it("should handle arrays in metadata", async () => {
      const serviceProviderData = {
        name: "Test Array Metadata",
        metadata: {
          supportedCountries: ["US", "CA", "UK"],
          features: ["HD", "4K", "HDR"],
          pricing: [9.99, 15.99, 19.99],
        },
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.metadata).toEqual(
        serviceProviderData.metadata
      );
    });

    it("should handle boolean values in metadata", async () => {
      const serviceProviderData = {
        name: "Test Boolean Metadata",
        metadata: {
          isActive: true,
          hasFreeTrial: false,
          supportsOffline: true,
        },
      };

      const response = await request(app.app)
        .post("/api/service-providers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(serviceProviderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.metadata).toEqual(
        serviceProviderData.metadata
      );
    });
  });
});
