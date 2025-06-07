"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = exports.getPrismaClient = exports.initializePrisma = void 0;
const client_1 = require("@prisma/client");
/**
 * Database configuration and connection management
 */
let prisma;
/**
 * Initialize Prisma client with configuration
 */
const initializePrisma = () => {
    if (!prisma) {
        prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === "development"
                ? ["query", "info", "warn", "error"]
                : ["error"],
        });
    }
    return prisma;
};
exports.initializePrisma = initializePrisma;
/**
 * Get Prisma client instance
 */
const getPrismaClient = () => {
    if (!prisma) {
        return (0, exports.initializePrisma)();
    }
    return prisma;
};
exports.getPrismaClient = getPrismaClient;
/**
 * Connect to database
 */
const connectDatabase = async () => {
    try {
        const client = (0, exports.getPrismaClient)();
        await client.$connect();
        console.log("✅ Database connected successfully");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
/**
 * Disconnect from database
 */
const disconnectDatabase = async () => {
    try {
        if (prisma) {
            await prisma.$disconnect();
            console.log("✅ Database disconnected successfully");
        }
    }
    catch (error) {
        console.error("❌ Database disconnection failed:", error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
//# sourceMappingURL=database.js.map