"use strict";
/**
 * Common utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.formatDate = exports.calculatePagination = exports.isValidEmail = exports.generateRandomString = void 0;
/**
 * Generate a random string of specified length
 */
const generateRandomString = (length = 10) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Calculate pagination offset
 */
const calculatePagination = (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    return { offset, limit };
};
exports.calculatePagination = calculatePagination;
/**
 * Format date to ISO string
 */
const formatDate = (date) => {
    return date.toISOString();
};
exports.formatDate = formatDate;
/**
 * Sleep utility for async operations
 */
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
//# sourceMappingURL=index.js.map