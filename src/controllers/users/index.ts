import { Request, Response, NextFunction } from "express";
import { IUserService, GoogleProfile } from "../../types/users";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError } from "../../utils/errors";

export class UserController {
  constructor(private userService: IUserService) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const session = await this.userService.register(req.body);
      sendSuccess(res, session, "User registered successfully", 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const session = await this.userService.login(req.body);
      sendSuccess(res, session, "Login successful");
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const session = await this.userService.refresh(req.body.refreshToken);
      sendSuccess(res, session, "Token refreshed");
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.userService.logout(req.body.refreshToken);
      sendSuccess(res, null, "Logout successful");
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const user = await this.userService.getProfile(req.user.id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const user = await this.userService.updateProfile(req.user.id, req.body);
      sendSuccess(res, { user }, "Profile updated successfully");
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      await this.userService.changePassword(req.user.id, req.body);
      sendSuccess(res, null, "Password changed successfully");
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = req.user as unknown as GoogleProfile | undefined;
      if (!profile?.googleId || !profile.email) {
        throw new UnauthorizedError("Google authentication failed");
      }
      const user = await this.userService.handleGoogleOAuth(profile);
      const session = await this.userService.issueSession(user);
      sendSuccess(res, session, "Google authentication successful");
    } catch (error) {
      next(error);
    }
  };
}

export const createUserController = (
  userService: IUserService
): UserController => new UserController(userService);
