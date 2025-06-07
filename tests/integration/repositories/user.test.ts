/**
 * User Repository Integration Tests
 */

import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../../../src/repositories/users";
import { UserRole } from "../../../src/types/users";

describe("PrismaUserRepository", () => {
  let prisma: PrismaClient;
  let userRepository: PrismaUserRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            "postgresql://test:test@localhost:5432/buddypass_test",
        },
      },
    });
    userRepository = new PrismaUserRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await prisma.user.deleteMany();
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // Create test users
      await prisma.user.createMany({
        data: [
          {
            email: "admin1@test.com",
            name: "Admin User 1",
            password: "hashedpassword1",
            provider: "local",
            role: UserRole.ADMIN,
            isActive: true,
            isVerified: true,
          },
          {
            email: "admin2@test.com",
            name: "Admin User 2",
            password: "hashedpassword2",
            provider: "local",
            role: UserRole.ADMIN,
            isActive: false,
            isVerified: true,
          },
          {
            email: "user1@test.com",
            name: "Regular User 1",
            password: "hashedpassword3",
            provider: "local",
            role: UserRole.USER,
            isActive: true,
            isVerified: false,
          },
          {
            email: "user2@test.com",
            name: "Regular User 2",
            password: "hashedpassword4",
            provider: "local",
            role: UserRole.USER,
            isActive: true,
            isVerified: true,
          },
          {
            email: "user3@test.com",
            name: "Regular User 3",
            password: "hashedpassword5",
            provider: "local",
            role: UserRole.USER,
            isActive: false,
            isVerified: true,
          },
        ],
      });
    });

    it("should return all users when no options provided", async () => {
      const users = await userRepository.findMany();

      expect(users).toHaveLength(5);
      expect(users[0].createdAt).toBeDefined();
    });

    it("should paginate users correctly", async () => {
      const page1 = await userRepository.findMany({ page: 1, limit: 2 });
      const page2 = await userRepository.findMany({ page: 2, limit: 2 });
      const page3 = await userRepository.findMany({ page: 3, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page3).toHaveLength(1);

      // Ensure no duplicate users across pages
      const allEmails = [...page1, ...page2, ...page3].map((u) => u.email);
      expect(new Set(allEmails).size).toBe(5);
    });

    it("should filter users by role", async () => {
      const adminUsers = await userRepository.findMany({
        role: UserRole.ADMIN,
      });
      const regularUsers = await userRepository.findMany({
        role: UserRole.USER,
      });

      expect(adminUsers).toHaveLength(2);
      expect(regularUsers).toHaveLength(3);

      adminUsers.forEach((user) => {
        expect(user.role).toBe(UserRole.ADMIN);
      });

      regularUsers.forEach((user) => {
        expect(user.role).toBe(UserRole.USER);
      });
    });

    it("should filter users by active status", async () => {
      const activeUsers = await userRepository.findMany({ isActive: true });
      const inactiveUsers = await userRepository.findMany({ isActive: false });

      expect(activeUsers).toHaveLength(3);
      expect(inactiveUsers).toHaveLength(2);

      activeUsers.forEach((user) => {
        expect(user.isActive).toBe(true);
      });

      inactiveUsers.forEach((user) => {
        expect(user.isActive).toBe(false);
      });
    });

    it("should combine role and status filters", async () => {
      const activeAdmins = await userRepository.findMany({
        role: UserRole.ADMIN,
        isActive: true,
      });

      const inactiveUsers = await userRepository.findMany({
        role: UserRole.USER,
        isActive: false,
      });

      expect(activeAdmins).toHaveLength(1);
      expect(activeAdmins[0].email).toBe("admin1@test.com");

      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].email).toBe("user3@test.com");
    });

    it("should order users correctly", async () => {
      const usersAsc = await userRepository.findMany({
        orderBy: { field: "email", direction: "asc" },
      });

      const usersDesc = await userRepository.findMany({
        orderBy: { field: "email", direction: "desc" },
      });

      expect(usersAsc[0].email).toBe("admin1@test.com");
      expect(usersAsc[4].email).toBe("user3@test.com");

      expect(usersDesc[0].email).toBe("user3@test.com");
      expect(usersDesc[4].email).toBe("admin1@test.com");
    });

    it("should handle empty results", async () => {
      // Clear all users first
      await prisma.user.deleteMany();

      const nonExistentRoleUsers = await userRepository.findMany({
        role: UserRole.ADMIN, // Valid role but no users exist
      });

      expect(nonExistentRoleUsers).toHaveLength(0);
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      // Create test users
      await prisma.user.createMany({
        data: [
          {
            email: "admin1@test.com",
            name: "Admin User 1",
            password: "hashedpassword1",
            provider: "local",
            role: UserRole.ADMIN,
            isActive: true,
            isVerified: true,
          },
          {
            email: "admin2@test.com",
            name: "Admin User 2",
            password: "hashedpassword2",
            provider: "local",
            role: UserRole.ADMIN,
            isActive: false,
            isVerified: true,
          },
          {
            email: "user1@test.com",
            name: "Regular User 1",
            password: "hashedpassword3",
            provider: "local",
            role: UserRole.USER,
            isActive: true,
            isVerified: false,
          },
          {
            email: "user2@test.com",
            name: "Regular User 2",
            password: "hashedpassword4",
            provider: "local",
            role: UserRole.USER,
            isActive: false,
            isVerified: true,
          },
        ],
      });
    });

    it("should count all users when no options provided", async () => {
      const totalCount = await userRepository.count();
      expect(totalCount).toBe(4);
    });

    it("should count users by role", async () => {
      const adminCount = await userRepository.count({ role: UserRole.ADMIN });
      const userCount = await userRepository.count({ role: UserRole.USER });

      expect(adminCount).toBe(2);
      expect(userCount).toBe(2);
    });

    it("should count users by active status", async () => {
      const activeCount = await userRepository.count({ isActive: true });
      const inactiveCount = await userRepository.count({ isActive: false });

      expect(activeCount).toBe(2);
      expect(inactiveCount).toBe(2);
    });

    it("should count users with combined filters", async () => {
      const activeAdminCount = await userRepository.count({
        role: UserRole.ADMIN,
        isActive: true,
      });

      const inactiveUserCount = await userRepository.count({
        role: UserRole.USER,
        isActive: false,
      });

      expect(activeAdminCount).toBe(1);
      expect(inactiveUserCount).toBe(1);
    });

    it("should return 0 for non-matching filters", async () => {
      // Clear all users first
      await prisma.user.deleteMany();

      const nonExistentCount = await userRepository.count({
        role: UserRole.ADMIN, // Valid role but no users exist
      });

      expect(nonExistentCount).toBe(0);
    });
  });

  describe("basic CRUD operations", () => {
    it("should create a user", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        provider: "local",
        role: UserRole.USER,
      };

      const user = await userRepository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(UserRole.USER);
      expect(user.isActive).toBe(true); // Default value
      expect(user.isVerified).toBe(false); // Default value
    });

    it("should find user by id", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        provider: "local",
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it("should find user by email", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        provider: "local",
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it("should update user", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        provider: "local",
      };

      const createdUser = await userRepository.create(userData);

      const updatedUser = await userRepository.update(createdUser.id, {
        name: "Updated Name",
      });

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.email).toBe(userData.email); // Should remain unchanged
    });

    it("should delete user", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        provider: "local",
      };

      const createdUser = await userRepository.create(userData);

      await userRepository.delete(createdUser.id);

      const deletedUser = await userRepository.findById(createdUser.id);
      expect(deletedUser).toBeNull();
    });
  });
});
