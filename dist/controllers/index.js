"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
/**
 * Base controller class with common functionality
 */
class BaseController {
    constructor() {
        /**
         * Async handler wrapper for error handling
         */
        this.asyncHandler = (fn) => {
            return (req, res, next) => {
                Promise.resolve(fn(req, res, next)).catch(next);
            };
        };
    }
    /**
     * Send success response
     */
    sendSuccess(res, data, message, statusCode = 200) {
        res.status(statusCode).json({
            success: true,
            message: message || "Operation successful",
            data,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send error response
     */
    sendError(res, message, statusCode = 400, error) {
        res.status(statusCode).json({
            success: false,
            message,
            error: process.env.NODE_ENV === "development" ? error : undefined,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.BaseController = BaseController;
/**
 * Controllers Export
 */
// Export user controllers following clean architecture
__exportStar(require("./users"), exports);
// Export other controllers
// ... add other controller exports here as needed
//# sourceMappingURL=index.js.map