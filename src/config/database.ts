import { PrismaClient } from "@prisma/client";

/**
 * Database configuration and connection management
 */
let prisma: PrismaClient;

/**
 * Initialize Prisma client with configuration
 */
export const initializePrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
    });
  }
  return prisma;
};

/**
 * Get Prisma client instance
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    return initializePrisma();
  }
  return prisma;
};

/**
 * Connect to database
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log("✅ Database disconnected successfully");
    }
  } catch (error) {
    console.error("❌ Database disconnection failed:", error);
    throw error;
  }
};
