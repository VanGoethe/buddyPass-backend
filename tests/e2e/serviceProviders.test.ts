/**
 * ServiceProvider E2E Tests
 */

import request from "supertest";
import { PrismaClient } from "@prisma/client";
import App from "../../src/app";
import { withTestCleanup, TestDataCleanup } from "../utils/testCleanup";
import { container } from "../../src/container";

const prisma = new PrismaClient();
const app = new App();

describe("ServiceProvider E2E Tests", () => {
  let cleanup: TestDataCleanup;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    cleanup = new TestDataCleanup();
  });

  afterAll(async () => {
    await cleanup.cleanupAll();
    await cleanup.disconnect();
  });

  beforeEach(async () => {
    // Clean up ALL service providers before each test to ensure clean state
    await prisma.serviceProvider.deleteMany({});

    // Create fresh test user for each test
    testUser = await cleanup.getOrCreateTestUser(
      `test-${Date.now()}@serviceProvider.com`
    );

    // Generate proper JWT token using the user service
    const userService = container.getUserService();
    authToken = userService.generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
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
            supportedCountries: [],
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
              { name: "Basic", price: 8.99, currencyId: "cmc6lpjqw00009utlsvz3enyx" },
              { name: "Premium", price: 15.99, currencyId: "cmc6lpjqw00009utlsvz3enyx" },
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
        name: "x".repeat(256), // Exceed 255 character limit
        description: "Valid description",
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
        name: "Valid Name",
        description: "x".repeat(1001), // Exceed 1000 character limit
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
        name: "Duplicate Test Service",
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
        .send({
          ...serviceProviderData,
          description: "Duplicate service provider",
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("CONFLICT");
      expect(response.body.error.message).toContain("already exists");
    });
  });

  describe("GET /api/service-providers", () => {
    beforeEach(async () => {
      // Create test service providers
      await prisma.serviceProvider.createMany({
        data: [
          {
            name: "Netflix Test",
            description: "Netflix streaming service",
          },
          {
            name: "Disney+ Test",
            description: "Disney streaming service",
          },
          {
            name: "Amazon Prime Test",
            description: "Amazon Prime Video streaming service",
          },
        ],
      });
    });

    it("should return all service providers", async () => {
      const response = await request(app.app)
        .get("/api/service-providers")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(3);
    });

    it("should support pagination", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?page=1&limit=2")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it("should support search by name", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?search=Netflix")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(1);
      expect(response.body.data.serviceProviders[0].name).toContain("Netflix");
    });

    it("should return empty array when no providers match search", async () => {
      const response = await request(app.app)
        .get("/api/service-providers?search=NonExistent")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProviders).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe("GET /api/service-providers/:id", () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          name: "Test Single Provider",
          description: "Single provider for testing",
          metadata: {
            category: "Entertainment",
            website: "https://example.com",
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it("should return service provider by ID", async () => {
      const response = await request(app.app)
        .get(`/api/service-providers/${serviceProviderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.id).toBe(serviceProviderId);
      expect(response.body.data.serviceProvider.name).toBe(
        "Test Single Provider"
      );
      expect(response.body.data.serviceProvider.metadata).toEqual({
        category: "Entertainment",
        website: "https://example.com",
      });
    });

    it("should return 404 for non-existent service provider", async () => {
      const response = await request(app.app)
        .get("/api/service-providers/non-existent-id")
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
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it("should update service provider successfully", async () => {
      const updateData = {
        name: "Updated Provider Name",
        description: "Updated description",
        metadata: {
          newField: "newValue",
          category: "Updated Category",
        },
      };

      const response = await request(app.app)
        .put(`/api/service-providers/${serviceProviderId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceProvider.name).toBe(
        "Updated Provider Name"
      );
      expect(response.body.data.serviceProvider.description).toBe(
        "Updated description"
      );
      expect(response.body.data.serviceProvider.metadata).toEqual(
        updateData.metadata
      );
    });

    it("should return 404 for non-existent service provider", async () => {
      const updateData = {
        name: "Updated Name",
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

      // Verify it's actually deleted
      const getResponse = await request(app.app)
        .get(`/api/service-providers/${serviceProviderId}`)
        .expect(404);
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
        name: "Null Metadata Test",
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
        name: "Empty Metadata Test",
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
        name: "Array Metadata Test",
        metadata: {
          tags: ["streaming", "entertainment", "video"],
          supportedDevices: ["iOS", "Android", "Web", "Smart TV"],
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
        name: "Boolean Metadata Test",
        metadata: {
          hasFreeTrial: true,
          requiresCreditCard: false,
          supportsOfflineDownload: true,
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
