import { Router } from "express";
import { container } from "../container";
import { authenticateJWT, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { adminRateLimiter } from "../middleware/rateLimit";
import {
  adminUpdateUserSchema,
  createAdminSchema,
  listUsersSchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdSchema,
} from "../types/schemas";

const router = Router();
const adminController = container.getAdminController();

router.use(adminRateLimiter);
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create an admin user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminRequest'
 *     responses:
 *       201:
 *         description: Admin created
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post("/users", validate(createAdminSchema), adminController.createUser);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Platform statistics
 *     description: |
 *       User, subscription, and service-provider counts, plus open capacity alerts.
 *       The alert list is the newest ten. `openCapacityAlerts.count` is the full open total.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 statistics:
 *                   totalUsers: 12
 *                   totalSubscriptions: 4
 *                   totalServiceProviders: 2
 *                 openCapacityAlerts:
 *                   count: 1
 *                   alerts:
 *                     - id: clalert1
 *                       serviceProviderId: clprovider1
 *                       serviceProviderName: Netflix
 *                       countryId: null
 *                       countryName: null
 *                       packingSubscriptionId: clsub1
 *                       headroom: 4
 *                       pendingCount: 0
 *                       recentRatePerHour: null
 *                       historicalFillMs: null
 *                       etaMs: null
 *                       horizonMs: null
 *                       openedAt: "2026-10-21T18:00:00.000Z"
 *                       updatedAt: "2026-10-21T18:00:00.000Z"
 *                 lastUpdated: "2026-10-21T18:05:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/dashboard", adminController.getDashboard);

/**
 * @swagger
 * /admin/capacity-alerts:
 *   get:
 *     summary: Open capacity alerts
 *     description: |
 *       Alerts for provider-and-country pools whose last allocatable account has started filling,
 *       or whose free seats no longer cover pending requests. Newest open alert first.
 *       `etaMs` and `horizonMs` are milliseconds. `recentRatePerHour` is omitted until two recent assignments exist.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Open capacity alerts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CapacityAlertListResponse'
 *             example:
 *               success: true
 *               data:
 *                 alerts:
 *                   - id: clalert1
 *                     serviceProviderId: clprovider1
 *                     serviceProviderName: Netflix
 *                     countryId: clcountry1
 *                     countryName: United States
 *                     packingSubscriptionId: clsub1
 *                     headroom: 4
 *                     pendingCount: 0
 *                     recentRatePerHour: 0.104
 *                     historicalFillMs: 172800000
 *                     etaMs: 138240000
 *                     horizonMs: 172800000
 *                     openedAt: "2026-10-21T18:00:00.000Z"
 *                     updatedAt: "2026-10-21T18:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/capacity-alerts", adminController.listCapacityAlerts);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Users
 */
router.get("/users", validate(listUsersSchema), adminController.listUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User
 */
router.get("/users/:userId", validate(userIdSchema), adminController.getUser);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   put:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put(
  "/users/:userId/status",
  validate(updateStatusSchema),
  adminController.updateStatus
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update a user's profile
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 */
router.put(
  "/users/:userId",
  validate(adminUpdateUserSchema),
  adminController.updateUser
);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   put:
 *     summary: Change a user's role
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put(
  "/users/:userId/role",
  validate(updateRoleSchema),
  adminController.updateRole
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete("/users/:userId", validate(userIdSchema), adminController.deleteUser);

export default router;
