"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
/**
 * Main router configuration
 */
const router = (0, express_1.Router)();
/**
 * API version 1 routes
 */
router.get("/", (req, res) => {
    res.json({
        message: "BuddyPass API",
        version: "1.0.0",
        status: "active",
        timestamp: new Date().toISOString(),
    });
});
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API server is running and healthy
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [OK]
 *                   description: Health status
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current server timestamp
 *                 version:
 *                   type: string
 *                   description: API version
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *               required: [status, timestamp]
 *             example:
 *               status: "OK"
 *               timestamp: "2025-06-04T20:50:09.000Z"
 *               version: "1.3.0"
 *               uptime: 3600.5
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.3.0",
        uptime: process.uptime(),
    });
});
// Feature-specific route imports
const users_1 = __importDefault(require("./users"));
const serviceProviders_1 = __importDefault(require("./serviceProviders"));
const subscriptions_1 = __importDefault(require("./subscriptions"));
const countries_1 = __importDefault(require("./countries"));
const admin_1 = __importDefault(require("./admin"));
// Route configurations
router.use("/users", users_1.default); // Clean architecture authentication and user management
router.use("/service-providers", serviceProviders_1.default); // ServiceProvider CRUD operations
router.use("/subscriptions", subscriptions_1.default); // Subscription CRUD operations
router.use("/countries", countries_1.default); // Country CRUD operations
router.use("/admin", admin_1.default); // Admin platform management routes
exports.default = router;
//# sourceMappingURL=index.js.map