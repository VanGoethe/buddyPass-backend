import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "../utils/logger";

let prisma: PrismaClient | undefined;

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return prisma;
};

export const connectDatabase = async (): Promise<void> => {
  const client = getPrismaClient();
  await client.$connect();
  logger.info("Database connected");
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
    logger.info("Database disconnected");
  }
};
