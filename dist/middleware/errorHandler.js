"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
/**
 * Custom error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    // Handle Prisma errors
    if (error.name === "PrismaClientKnownRequestError") {
        statusCode = 400;
        message = "Database operation failed";
    }
    // Handle validation errors
    if (error.name === "ValidationError") {
        statusCode = 400;
        message = error.message;
    }
    // Log error in development
    if (process.env.NODE_ENV === "development") {
        console.error("Error:", error);
    }
    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        timestamp: new Date().toISOString(),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map