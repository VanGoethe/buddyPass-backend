import { NextFunction, Request, Response } from "express";
import { AdminService } from "../../services/admin";
import { UserRole } from "../../types/users";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError } from "../../utils/errors";

export class AdminController {
  constructor(private adminService: AdminService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.adminService.createAdmin(req.body);
      sendSuccess(res, { user }, "Admin user created successfully", 201);
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.adminService.getDashboard());
    } catch (error) {
      next(error);
    }
  };

  listCapacityAlerts = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const alerts = await this.adminService.listCapacityAlerts();
      sendSuccess(res, { alerts });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        status: "active" | "inactive" | "all";
        role: "USER" | "ADMIN" | "all";
      };
      sendSuccess(res, await this.adminService.listUsers(query));
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.adminService.getUser(req.params.userId);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.adminService.updateStatus(
        req.user.id,
        req.params.userId,
        req.body.isActive
      );
      sendSuccess(
        res,
        { user },
        `User ${req.body.isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.adminService.updateRole(
        req.user.id,
        req.params.userId,
        req.body.role as UserRole
      );
      sendSuccess(res, { user }, `User role updated to ${req.body.role} successfully`);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.adminService.updateUser(req.params.userId, req.body);
      sendSuccess(res, { user }, "User information updated successfully");
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      await this.adminService.deleteUser(req.user.id, req.params.userId);
      sendSuccess(res, null, "User account deleted successfully");
    } catch (error) {
      next(error);
    }
  };

  setVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.adminService.setVerified(
        req.params.userId,
        req.body.isVerified
      );
      sendSuccess(res, { user }, "Verification updated");
    } catch (error) {
      next(error);
    }
  };

  listWaitingLine = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      sendSuccess(res, { waiting: await this.adminService.listWaitingLine() });
    } catch (error) {
      next(error);
    }
  };

  createAccountFromAlert = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body as {
        name: string;
        email: string;
        password: string;
        maxSlots: number;
        expiresAt?: string;
        userPrice?: number;
        accountCost?: number;
        currencyId?: string;
        isActive?: boolean;
      };
      const subscription = await this.adminService.createAccountFromAlert(
        req.params.alertId,
        {
          ...body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        }
      );
      sendSuccess(res, subscription, "Account created from alert", 201);
    } catch (error) {
      next(error);
    }
  };

  listReveals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reveals = await this.adminService.listReveals(req.params.id);
      sendSuccess(res, { reveals });
    } catch (error) {
      next(error);
    }
  };
}
