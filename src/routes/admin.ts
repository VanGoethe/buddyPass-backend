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
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get("/dashboard", adminController.getDashboard);

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
