/**
 * User Controller Implementation
 */

import { Request, Response } from "express";
import {
  IUserService,
  RegisterRequest,
  LoginRequest,
  GoogleOAuthUser,
  TokenPayload,
  ChangePasswordRequest,
} from "../../types/users";

export class UserController {
  constructor(private userService: IUserService) {}

  /**
   * Register new user with email and password
   * POST /users/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name }: RegisterRequest = req.body;
      console.log("Register request:", req.body);

      const result = await this.userService.register({
        email,
        password,
        name,
      });

      if (!result.success) {
        res.status(409).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Login user with email and password
   * POST /users/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      const result = await this.userService.login({
        email,
        password,
      });

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Logout user (client-side token disposal)
   * POST /users/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.userService.logout();
      res.json(result);
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get current user profile
   * GET /users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Authentication required",
          },
        });
        return;
      }

      const result = await this.userService.getProfile(req.user.id);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error",
        },
      });
    }
  }

  /**
   * Update user profile
   * PUT /users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Authentication required",
          },
        });
        return;
      }

      const { name, avatar } = req.body;
      const result = await this.userService.updateProfile(req.user.id, {
        name,
        avatar,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error",
        },
      });
    }
  }

  /**
   * Change user password
   * PUT /users/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Authentication required",
          },
        });
        return;
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
      const result = await this.userService.changePassword(req.user.id, {
        currentPassword,
        newPassword,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error",
        },
      });
    }
  }

  /**
   * Google OAuth callback handler
   * GET /users/auth/google/callback
   */
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      // Extract Google user data from Passport
      const googleUser = req.user as any;

      if (!googleUser) {
        res.status(401).json({
          success: false,
          message: "Google authentication failed",
        });
        return;
      }

      // Handle Google OAuth through service
      const user = await this.userService.handleGoogleOAuth({
        googleId: googleUser.id,
        email: googleUser.emails[0].value,
        name: googleUser.displayName,
        avatar: googleUser.photos?.[0]?.value,
      });

      // Generate access token
      const accessToken = this.userService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Convert to response format
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json({
        success: true,
        message: "Google authentication successful",
        data: {
          user: userResponse,
          accessToken,
        },
      });
    } catch (error) {
      console.error("Google callback error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

// Export a factory function to create controller instance
export const createUserController = (
  userService: IUserService
): UserController => {
  return new UserController(userService);
};
