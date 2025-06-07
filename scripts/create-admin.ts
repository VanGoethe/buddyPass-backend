#!/usr/bin/env ts-node

/**
 * Script to create an admin user for platform management
 * Usage: npm run create-admin
 */

import { PrismaClient } from "@prisma/client";
import { createUserService } from "../src/services/users";
import { createUserRepository } from "../src/repositories/users";
import { CreateAdminRequest } from "../src/types/users";

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log("🔧 Creating admin user...");

    // Get admin details from environment variables or use defaults
    const adminData: CreateAdminRequest = {
      email: process.env.ADMIN_EMAIL || "admin@buddypass.com",
      password: process.env.ADMIN_PASSWORD || "AdminPass123!",
      name: process.env.ADMIN_NAME || "BuddyPass Admin",
    };

    // Create services
    const userRepository = createUserRepository(prisma);
    const userService = createUserService(userRepository);

    // Create admin user
    const result = await userService.createAdmin(adminData);

    if (result.success) {
      console.log("✅ Admin user created successfully!");
      console.log(`📧 Email: ${adminData.email}`);
      console.log(`👤 Name: ${adminData.name}`);
      console.log(`🔑 Password: ${adminData.password}`);
      console.log(
        "\n⚠️  Please change the default password after first login!"
      );
    } else {
      console.log("❌ Failed to create admin user:");
      console.log(result.message);
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser();
