"use strict";
/**
 * User Routes
 * Following MVP endpoint structure
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../config/passport"));
const container_1 = require("../container");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const userController = container_1.container.getUserController();
// Rate limiting for user auth endpoints
const loginRateLimit = (0, auth_1.authRateLimit)(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const registerRateLimit = (0, auth_1.authRateLimit)(3, 60 * 60 * 1000); // 3 attempts per hour
const passwordChangeRateLimit = (0, auth_1.authRateLimit)(3, 60 * 60 * 1000); // 3 attempts per hour
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
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
router.post("/register", registerRateLimit, validation_1.registerValidation, auth_1.validateRequest, (req, res) => {
    userController.register(req, res);
});
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
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *                 code: "ACCOUNT_DEACTIVATED"
 *                 message: "Your account has been deactivated"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/login", loginRateLimit, validation_1.loginValidation, auth_1.validateRequest, (req, res) => {
    userController.login(req, res);
});
/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Logout user (client-side token disposal)
 *     description: Instructs client to dispose of JWT token. No server-side action required for stateless JWT.
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/logout", (req, res) => {
    userController.logout(req, res);
});
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
router.get("/profile", auth_1.authenticateJWT, (req, res) => {
    userController.getProfile(req, res);
});
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
router.put("/profile", auth_1.authenticateJWT, (req, res) => {
    userController.updateProfile(req, res);
});
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
router.put("/change-password", passwordChangeRateLimit, auth_1.authenticateJWT, validation_1.changePasswordValidation, auth_1.validateRequest, (req, res) => {
    userController.changePassword(req, res);
});
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
router.get("/auth/google", passport_1.default.authenticate("google", {
    scope: ["profile", "email"],
}));
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
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
router.get("/auth/google/callback", passport_1.default.authenticate("google", { session: false }), (req, res) => {
    userController.googleCallback(req, res);
});
exports.default = router;
//# sourceMappingURL=users.js.map