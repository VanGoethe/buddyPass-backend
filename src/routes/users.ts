/**
 * User Routes
 * Following MVP endpoint structure
 */

import { Router, Request, Response, NextFunction } from "express";
import passport from "../config/passport";
import { container } from "../container";
import { authenticateJWT } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordChangeRateLimiter,
} from "../middleware/rateLimit";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from "../types/schemas";

const router = Router();
const userController = container.getUserController();

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user account
 *     description: Create a new user account with email and password. Email must be unique.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *             name: "John Doe"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "opaque-refresh-token"
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *                   role: "USER"
 *                   isVerified: false
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *               message: "User registered successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
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
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/register",
  registerRateLimiter,
  validate(registerSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.register(req, res, next);
  }
);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     description: Login with email and password to receive a JWT access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "opaque-refresh-token"
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *                   role: "USER"
 *                   isVerified: false
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *               message: "Login successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Invalid email or password"
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "USER_INACTIVE"
 *                 message: "Your account has been deactivated"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.login(req, res, next);
  }
);

/**
 * @swagger
 * /users/refresh:
 *   post:
 *     summary: Rotate a refresh token
 *     description: Returns a new access token and refresh token. Reuse of a rotated token revokes the token family.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Tokens rotated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 * /users/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     description: Revokes the presented refresh token. Send it in the body.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logout successful"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/refresh",
  loginRateLimiter,
  validate(refreshSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.refresh(req, res, next);
  }
);

router.post(
  "/logout",
  validate(refreshSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.logout(req, res, next);
  }
);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                   name: "John Doe"
 *                   avatar: "https://example.com/avatar.jpg"
 *                   role: "USER"
 *                   isVerified: false
 *                   provider: "local"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/profile",
  authenticateJWT,
  (req: Request, res: Response, next: NextFunction) => {
    void userController.getProfile(req, res, next);
  }
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information (name and avatar)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             name: "John Smith"
 *             avatar: "https://example.com/new-avatar.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   name: "John Smith"
 *                   avatar: "https://example.com/new-avatar.jpg"
 *                   role: "USER"
 *                   isVerified: false
 *                   provider: "local"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *               message: "Profile updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/profile",
  authenticateJWT,
  validate(updateProfileSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.updateProfile(req, res, next);
  }
);

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Change user password
 *     description: Change the authenticated user's password. Requires current password for verification.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           example:
 *             currentPassword: "OldPassword123!"
 *             newPassword: "NewSecurePass456@"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid current password or unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidPassword:
 *                 summary: Invalid current password
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_PASSWORD"
 *                     message: "Current password is incorrect"
 *               unauthorized:
 *                 $ref: '#/components/responses/UnauthorizedError/content/application\/json/example'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/change-password",
  passwordChangeRateLimiter,
  authenticateJWT,
  validate(changePasswordSchema),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.changePassword(req, res, next);
  }
);

/**
 * @swagger
 * /users/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     description: Redirects to Google OAuth consent screen for authentication
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *         headers:
 *           Location:
 *             description: Google OAuth authorization URL
 *             schema:
 *               type: string
 *               format: uri
 *               example: "https://accounts.google.com/oauth/authorize?..."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * @swagger
 * /users/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles Google OAuth callback and creates/authenticates user account
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google OAuth
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Optional state parameter for CSRF protection
 *     responses:
 *       200:
 *         description: OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "opaque-refresh-token"
 *                 user:
 *                   id: "cm4abc123def456ghi"
 *                   email: "user@gmail.com"
 *                   name: "John Doe"
 *                   avatar: "https://lh3.googleusercontent.com/..."
 *                   role: "USER"
 *                   isVerified: true
 *                   provider: "google"
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   lastLoginAt: "2025-06-04T20:55:09.000Z"
 *               message: "Authentication successful"
 *       401:
 *         description: OAuth authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "OAUTH_ERROR"
 *                 message: "Google OAuth authentication failed"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req: Request, res: Response, next: NextFunction) => {
    void userController.googleCallback(req, res, next);
  }
);

export default router;
