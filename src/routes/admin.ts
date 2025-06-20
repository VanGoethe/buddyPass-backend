/**
 * Admin Routes
 * Routes for platform administration and management
 */

import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { getRateLimitForEndpoint } from "../config";
import {
  authenticateJWT,
  requireAdmin,
  validateRequest,
  authRateLimit,
} from "../middleware/auth";

const router = Router();

// Rate limiting for admin endpoints using centralized configuration
const adminConfig = getRateLimitForEndpoint("admin");
const adminRateLimit = authRateLimit(
  adminConfig.maxAttempts,
  adminConfig.windowMs
);

// Apply rate limiting, authentication and admin requirement to all admin routes
router.use(adminRateLimit);
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new admin user
 *     description: Create a new user account with admin privileges. Only accessible by existing admins.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminRequest'
 *           example:
 *             email: "admin@example.com"
 *             password: "AdminPass123!"
 *             name: "Admin User"
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/UserResponse'
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "cm4xyz789abc012def"
 *                   email: "admin@example.com"
 *                   name: "Admin User"
 *                   role: "ADMIN"
 *                   isVerified: true
 *                   isActive: true
 *                   provider: "local"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *               message: "Admin user created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "EMAIL_EXISTS"
 *                 message: "User with this email already exists"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/users",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters long"),
    validateRequest,
  ],
  async (req: Request, res: Response) => {
    try {
      const { container } = require("../container");
      const userService = container.getUserService();

      const result = await userService.createAdmin(req.body);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Admin user creation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ADMIN_CREATION_ERROR",
          message: "Failed to create admin user",
        },
      });
    }
  }
);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: Retrieve platform statistics including total users, subscriptions, and service providers
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AdminDashboard'
 *             example:
 *               success: true
 *               data:
 *                 statistics:
 *                   totalUsers: 150
 *                   totalSubscriptions: 45
 *                   totalServiceProviders: 12
 *                 lastUpdated: "2025-06-04T20:50:09.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const { container } = require("../container");
    const userRepository = container.getUserRepository();
    const subscriptionRepository = container.getSubscriptionRepository();
    const serviceProviderRepository = container.getServiceProviderRepository();

    // Get platform statistics
    const [totalUsers, totalSubscriptions, totalServiceProviders] =
      await Promise.all([
        userRepository.count(),
        subscriptionRepository.count ? subscriptionRepository.count() : 0,
        serviceProviderRepository.count ? serviceProviderRepository.count() : 0,
      ]);

    res.json({
      success: true,
      data: {
        statistics: {
          totalUsers,
          totalSubscriptions,
          totalServiceProviders,
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DASHBOARD_ERROR",
        message: "Failed to load dashboard data",
      },
    });
  }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin view)
 *     description: Retrieve a list of all users with admin-level information including account status
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *           default: all
 *         description: Filter users by account status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN, all]
 *           default: all
 *         description: Filter users by role
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/UserResponse'
 *                               - type: object
 *                                 properties:
 *                                   isActive:
 *                                     type: boolean
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *             example:
 *               success: true
 *               data:
 *                 users:
 *                   - id: "cm4abc123def456ghi"
 *                     email: "user1@example.com"
 *                     name: "John Doe"
 *                     role: "USER"
 *                     isActive: true
 *                     isVerified: false
 *                     provider: "local"
 *                     createdAt: "2025-06-04T20:50:09.000Z"
 *                     lastLoginAt: "2025-06-04T20:55:09.000Z"
 *                   - id: "cm4xyz789abc012def"
 *                     email: "admin@example.com"
 *                     name: "Admin User"
 *                     role: "ADMIN"
 *                     isActive: true
 *                     isVerified: true
 *                     provider: "local"
 *                     createdAt: "2025-06-04T19:50:09.000Z"
 *                     lastLoginAt: "2025-06-04T20:50:09.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 150
 *                   totalPages: 15
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/users", async (req: Request, res: Response) => {
  try {
    const { container } = require("../container");
    const userRepository = container.getUserRepository();

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const status = req.query.status as string;
    const role = req.query.role as string;

    // Build options for findMany
    const options: any = {
      page,
      limit,
    };

    if (status && status !== "all") {
      options.isActive = status === "active";
    }

    // Validate role parameter
    if (role && role !== "all") {
      const validRoles = ["USER", "ADMIN"];
      if (validRoles.includes(role.toUpperCase())) {
        options.role = role.toUpperCase();
      }
      // If invalid role, ignore it (don't set options.role)
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      userRepository.findMany(options),
      userRepository.count({
        role: options.role,
        isActive: options.isActive,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          provider: user.provider,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "USERS_LIST_ERROR",
        message: "Failed to fetch users",
      },
    });
  }
});

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   put:
 *     summary: Update user account status
 *     description: Activate or deactivate a user account. Admins cannot deactivate their own accounts.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique user identifier
 *         example: "cm4abc123def456ghi"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserStatusRequest'
 *           example:
 *             isActive: false
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: cuid
 *                             email:
 *                               type: string
 *                               format: email
 *                             name:
 *                               type: string
 *                             isActive:
 *                               type: boolean
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *                   isActive: false
 *               message: "User deactivated successfully"
 *       400:
 *         description: Validation error or self-deactivation attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 $ref: '#/components/responses/ValidationError/content/application\/json/schema'
 *               selfDeactivation:
 *                 summary: Self-deactivation attempt
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "SELF_DEACTIVATION_ERROR"
 *                     message: "Cannot deactivate your own account"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/users/:userId/status",
  [
    body("isActive")
      .isBoolean()
      .withMessage("isActive must be a boolean value"),
    validateRequest,
  ],
  async (req: Request, res: Response) => {
    try {
      const { container } = require("../container");
      const userRepository = container.getUserRepository();
      const { userId } = req.params;
      const { isActive } = req.body;

      // Prevent admin from deactivating themselves
      if (userId === req.user!.id && !isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SELF_DEACTIVATION_ERROR",
            message: "Cannot deactivate your own account",
          },
        });
      }

      const updatedUser = await userRepository.update(userId, { isActive });

      res.json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            isActive: updatedUser.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Admin user status update error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_STATUS_UPDATE_ERROR",
          message: "Failed to update user status",
        },
      });
    }
  }
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get individual user details
 *     description: Retrieve detailed information about a specific user including admin-level data
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique user identifier
 *         example: "cm4abc123def456ghi"
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           allOf:
 *                             - $ref: '#/components/schemas/UserResponse'
 *                             - type: object
 *                               properties:
 *                                 isActive:
 *                                   type: boolean
 *                                 updatedAt:
 *                                   type: string
 *                                   format: date-time
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *                   role: "USER"
 *                   isActive: true
 *                   isVerified: false
 *                   provider: "local"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   updatedAt: "2025-06-04T20:55:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { container } = require("../container");
    const userRepository = container.getUserRepository();
    const { userId } = req.params;

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Return user details with admin-level information
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          provider: user.provider,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin get user error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "GET_USER_ERROR",
        message: "Failed to retrieve user details",
      },
    });
  }
});

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update user information
 *     description: Update user profile information. Cannot update sensitive fields like email or password.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique user identifier
 *         example: "cm4abc123def456ghi"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateUserRequest'
 *           example:
 *             name: "Updated Name"
 *             avatar: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/UserResponse'
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "Updated Name"
 *                   role: "USER"
 *                   isActive: true
 *                   isVerified: false
 *                   provider: "local"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *               message: "User information updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/users/:userId",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
    validateRequest,
  ],
  async (req: Request, res: Response) => {
    try {
      const { container } = require("../container");
      const userRepository = container.getUserRepository();
      const { userId } = req.params;
      const { name, avatar } = req.body;

      // Check if user exists
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      // Build update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;

      // Only update if there's actual data to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_UPDATE_DATA",
            message: "No valid update data provided",
          },
        });
      }

      const updatedUser = await userRepository.update(userId, updateData);

      res.json({
        success: true,
        message: "User information updated successfully",
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            isVerified: updatedUser.isVerified,
            provider: updatedUser.provider,
            avatar: updatedUser.avatar,
            createdAt: updatedUser.createdAt,
            lastLoginAt: updatedUser.lastLoginAt,
          },
        },
      });
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "UPDATE_USER_ERROR",
          message: "Failed to update user information",
        },
      });
    }
  }
);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   put:
 *     summary: Update user role
 *     description: Change a user's role between USER and ADMIN. Cannot change own role to prevent lockout.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique user identifier
 *         example: "cm4abc123def456ghi"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRoleRequest'
 *           example:
 *             role: "ADMIN"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: cuid
 *                             email:
 *                               type: string
 *                               format: email
 *                             name:
 *                               type: string
 *                             role:
 *                               type: string
 *                               enum: [USER, ADMIN]
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *                   role: "ADMIN"
 *               message: "User role updated to ADMIN successfully"
 *       400:
 *         description: Validation error or self-role change attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 $ref: '#/components/responses/ValidationError/content/application\/json/schema'
 *               selfRoleChange:
 *                 summary: Self-role change attempt
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "SELF_ROLE_CHANGE_ERROR"
 *                     message: "Cannot change your own role"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/users/:userId/role",
  [
    body("role")
      .isIn(["USER", "ADMIN"])
      .withMessage("Role must be either USER or ADMIN"),
    validateRequest,
  ],
  async (req: Request, res: Response) => {
    try {
      const { container } = require("../container");
      const userRepository = container.getUserRepository();
      const { userId } = req.params;
      const { role } = req.body;

      // Prevent admin from changing their own role
      if (userId === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SELF_ROLE_CHANGE_ERROR",
            message: "Cannot change your own role",
          },
        });
      }

      // Check if user exists
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      const updatedUser = await userRepository.update(userId, { role });

      res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
        },
      });
    } catch (error) {
      console.error("Admin user role update error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_ROLE_UPDATE_ERROR",
          message: "Failed to update user role",
        },
      });
    }
  }
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete user account
 *     description: Permanently delete a user account and all associated data. Cannot delete own account.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique user identifier
 *         example: "cm4abc123def456ghi"
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "User account deleted successfully"
 *       400:
 *         description: Self-deletion attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SELF_DELETION_ERROR"
 *                 message: "Cannot delete your own account"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { container } = require("../container");
    const userRepository = container.getUserRepository();
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "SELF_DELETION_ERROR",
          message: "Cannot delete your own account",
        },
      });
    }

    // Check if user exists before attempting deletion
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    await userRepository.delete(userId);

    res.json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DELETE_USER_ERROR",
        message: "Failed to delete user account",
      },
    });
  }
});

export default router;
