import { Router } from "express";

/**
 * Main router configuration
 */
const router = Router();

/**
 * API version 1 routes
 */
router.get("/", (_req, res) => {
  res.json({
    message: "BuddyPass API",
    version: "2.0.0",
    status: "active",
    timestamp: new Date().toISOString(),
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
