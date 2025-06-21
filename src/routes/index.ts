import { Router } from "express";

/**
 * Main router configuration
 */
const router = Router();

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
import userRoutes from "./users";
import serviceProviderRoutes from "./serviceProviders";
import subscriptionRoutes from "./subscriptions";
import countryRoutes from "./countries";
import currencyRoutes from "./currencies";
import adminRoutes from "./admin";

// Route configurations
router.use("/users", userRoutes); // Clean architecture authentication and user management
router.use("/service-providers", serviceProviderRoutes); // ServiceProvider CRUD operations
router.use("/subscriptions", subscriptionRoutes); // Subscription CRUD operations
router.use("/countries", countryRoutes); // Country CRUD operations
router.use("/currencies", currencyRoutes); // Currency CRUD operations
router.use("/admin", adminRoutes); // Admin platform management routes

export default router;
