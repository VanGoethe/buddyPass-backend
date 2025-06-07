import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/users";
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
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
/**
 * JWT Authentication middleware using clean architecture pattern
 * This replaces both authenticateJWT and authenticateUserJWT
 */
export declare const authenticateJWT: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional JWT Authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work for both authenticated and non-authenticated users
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check if user is verified
 * Must be used after authenticateJWT
 */
export declare const requireVerified: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limiting middleware for auth endpoints
 */
export declare const authRateLimit: (maxAttempts?: number, windowMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user owns the resource
 * Expects req.params.userId or req.user.id to match
 */
export declare const requireOwnership: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user has admin role
 * Must be used after authenticateJWT
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user has admin role or owns the resource
 * Must be used after authenticateJWT
 */
export declare const requireAdminOrOwnership: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map