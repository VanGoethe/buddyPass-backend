#!/usr/bin/env ts-node

import { getPrismaClient, disconnectDatabase } from "../src/config/database";
import { env } from "../src/config/env";
import { createUserRepository } from "../src/repositories/users";
import { createUserService } from "../src/services/users";
import { logger } from "../src/utils/logger";

async function createAdminUser(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    process.exit(1);
  }

  const prisma = getPrismaClient();
  try {
    const userRepository = createUserRepository(prisma);
    const userService = createUserService(userRepository, prisma);
    const user = await userService.createAdmin({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      name: env.ADMIN_NAME || "BuddyPass Admin",
    });
    logger.info({ email: user.email, id: user.id }, "Admin user created");
  } finally {
    await disconnectDatabase();
  }
}

createAdminUser().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to create admin user");
  process.exit(1);
});
