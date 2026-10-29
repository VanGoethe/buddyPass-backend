import { Router } from "express";
import { container } from "../container";
import { authenticateJWT, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { adminRateLimiter } from "../middleware/rateLimit";
import {
  adminUpdateUserSchema,
  createAdminSchema,
  listUsersSchema,
  alertAccountSchema,
  idParamSchema,
  incidentIdSchema,
  incidentListSchema,
  notificationIdSchema,
  paymentIdSchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdSchema,
  verifyUserSchema,
} from "../types/schemas";

const router = Router();
const adminController = container.getAdminController();
const paymentController = container.getPaymentController();
const notificationController = container.getNotificationController();
const incidentController = container.getIncidentController();
const loginCodeController = container.getLoginCodeController();

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

/**
 * @swagger
 * /admin/users/{userId}/verification:
 *   put:
 *     summary: Verify or unverify a local account
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification updated
 */
router.put(
  "/users/:userId/verification",
  validate(verifyUserSchema),
  adminController.setVerified
);

/**
 * @swagger
 * /admin/waiting-line:
 *   get:
 *     summary: Pending seat requests
 *     description: Read-only line. Assignment stays automatic.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting line
 */
router.get("/waiting-line", adminController.listWaitingLine);

/**
 * @swagger
 * /admin/capacity-alerts/{alertId}/accounts:
 *   post:
 *     summary: Stock the next account for an open alert
 *     description: Provider and country come from the alert. Pending requests for that pool are filled automatically.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Account created
 */
router.post(
  "/capacity-alerts/:alertId/accounts",
  validate(alertAccountSchema),
  adminController.createAccountFromAlert
);

/**
 * @swagger
 * /admin/subscriptions/{id}/reveals:
 *   get:
 *     summary: Credential reveal history
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reveal records
 */
router.get(
  "/subscriptions/:id/reveals",
  validate(idParamSchema),
  adminController.listReveals
);

/**
 * @swagger
 * /admin/incidents:
 *   get:
 *     summary: Login incidents
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incidents
 */
router.get("/incidents", validate(incidentListSchema), incidentController.list);

/**
 * @swagger
 * /admin/incidents/{incidentId}:
 *   put:
 *     summary: Resolve a login incident
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Incident resolved
 */
router.put(
  "/incidents/:incidentId",
  validate(incidentIdSchema),
  incidentController.resolve
);

/**
 * @swagger
 * /admin/notifications:
 *   get:
 *     summary: Notices the system has sent
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications
 */
router.get("/notifications", notificationController.listAll);

/**
 * @swagger
 * /admin/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a notice read
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notice marked read
 */
router.put(
  "/notifications/:notificationId/read",
  validate(notificationIdSchema),
  notificationController.markRead
);

/**
 * @swagger
 * /admin/login-codes:
 *   get:
 *     summary: Unmatched login codes
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Codes that did not match a seat alias
 */
router.get("/login-codes", loginCodeController.listUnmatched);

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Seat payments
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payments
 */
router.get("/payments", paymentController.list);

/**
 * @swagger
 * /admin/payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm a pending payment
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.post(
  "/payments/:paymentId/confirm",
  validate(paymentIdSchema),
  paymentController.confirm
);

/**
 * @swagger
 * /admin/payments/{paymentId}/fail:
 *   put:
 *     summary: Mark a pending payment as failed
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment failed
 */
router.put(
  "/payments/:paymentId/fail",
  validate(paymentIdSchema),
  paymentController.fail
);

export default router;
