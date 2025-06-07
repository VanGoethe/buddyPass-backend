import { PrismaClient } from "@prisma/client";
/**
 * Initialize Prisma client with configuration
 */
export declare const initializePrisma: () => PrismaClient;
/**
 * Get Prisma client instance
 */
export declare const getPrismaClient: () => PrismaClient;
/**
 * Connect to database
 */
export declare const connectDatabase: () => Promise<void>;
/**
 * Disconnect from database
 */
export declare const disconnectDatabase: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map