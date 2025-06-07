import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { TokenPayload, UserRole } from "../types/users";

// Lazy import container to avoid circular dependency issues during test setup
const getContainer = () => {
  const { container } = require("../container");
  return container;
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      provider?: string | null;
      role: UserRole;
      isVerified: boolean;
      isActive: boolean;
    }
  }
}

/**
 * Middleware to validate request body using express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: errors.array(),
      },
    });
    return;
  }

  next();
};

/**
 * JWT Authentication middleware using clean architecture pattern
 * This replaces both authenticateJWT and authenticateUserJWT
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Access token is required",
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Use dependency injection to get services
    const userService = getContainer().getUserService();
    const userRepository = getContainer().getUserRepository();

    // Verify token using user service
    const payload = userService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid or expired",
        },
      });
      return;
    }

    // Get user from repository
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User associated with token not found",
        },
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: "USER_INACTIVE",
          message: "User account is deactivated",
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      isVerified: user.isVerified || false,
      isActive: user.isActive || true,
    };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error occurred",
      },
    });
  }
};

/**
 * Optional JWT Authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work for both authenticated and non-authenticated users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const userService = getContainer().getUserService();
    const userRepository = getContainer().getUserRepository();

    const payload = userService.verifyAccessToken(token);

    if (payload) {
      const user = await userRepository.findById(payload.userId);

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider,
          role: user.role,
          isVerified: user.isVerified || false,
          isActive: user.isActive || true,
        };
      }
    }

    next();
  } catch (error) {
    // In optional auth, we don't fail on errors, just log them
    console.error("Optional auth error:", error);
    next();
  }
};

/**
 * Middleware to check if user is verified
 * Must be used after authenticateJWT
 */
export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Email verification required to access this resource",
      },
    });
    return;
  }

  next();
};

/**
 * Rate limiting middleware for auth endpoints
 */
export const authRateLimit = (
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const userAttempts = attempts.get(key);

    if (userAttempts && now < userAttempts.resetTime) {
      if (userAttempts.count >= maxAttempts) {
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              "Too many authentication attempts. Please try again later.",
            details: {
              retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
            },
          },
        });
        return;
      }
      userAttempts.count++;
    } else {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to cleanup
      const now = Date.now();
      for (const [key, attempt] of attempts.entries()) {
        if (now > attempt.resetTime) {
          attempts.delete(key);
        }
      }
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * Expects req.params.userId or req.user.id to match
 */
export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  const resourceUserId = req.params.userId || req.body.userId;

  if (resourceUserId && resourceUserId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to access this resource",
      },
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has admin role
 * Must be used after authenticateJWT
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: {
        code: "ADMIN_REQUIRED",
        message: "Admin access required for this resource",
      },
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has admin role or owns the resource
 * Must be used after authenticateJWT
 */
export const requireAdminOrOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

  // Admin can access any resource
  if (req.user.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Check ownership for non-admin users
  const resourceUserId = req.params.userId || req.body.userId;

  if (resourceUserId && resourceUserId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to access this resource",
      },
    });
    return;
  }

  next();
};
