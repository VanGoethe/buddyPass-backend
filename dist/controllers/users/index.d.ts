/**
 * User Controller Implementation
 */
import { Request, Response } from "express";
import { IUserService } from "../../types/users";
export declare class UserController {
    private userService;
    constructor(userService: IUserService);
    /**
     * Register new user with email and password
     * POST /users/register
     */
    register(req: Request, res: Response): Promise<void>;
    /**
     * Login user with email and password
     * POST /users/login
     */
    login(req: Request, res: Response): Promise<void>;
    /**
     * Logout user (client-side token disposal)
     * POST /users/logout
     */
    logout(req: Request, res: Response): Promise<void>;
    /**
     * Get current user profile
     * GET /users/profile
     */
    getProfile(req: Request, res: Response): Promise<void>;
    /**
     * Update user profile
     * PUT /users/profile
     */
    updateProfile(req: Request, res: Response): Promise<void>;
    /**
     * Change user password
     * PUT /users/change-password
     */
    changePassword(req: Request, res: Response): Promise<void>;
    /**
     * Google OAuth callback handler
     * GET /users/auth/google/callback
     */
    googleCallback(req: Request, res: Response): Promise<void>;
}
export declare const createUserController: (userService: IUserService) => UserController;
//# sourceMappingURL=index.d.ts.map