import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { INotificationService } from "../../services/notifications";
import { IncidentService } from "../../services/incidents";
import { InboxService } from "../../services/inbox";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError } from "../../utils/errors";

export class NotificationController {
  constructor(private notifications: INotificationService) {}

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notifications = await this.notifications.listForRecipient(req.user.id);
      sendSuccess(res, { notifications });
    } catch (error) {
      next(error);
    }
  };

  listAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, { notifications: await this.notifications.listAll() });
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notification = await this.notifications.markRead(req.params.notificationId, {
        id: req.user.id,
        role: req.user.role as UserRole,
      });
      sendSuccess(res, { notification });
    } catch (error) {
      next(error);
    }
  };
}

export class IncidentController {
  constructor(private incidents: IncidentService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscriptionId =
        typeof req.query.subscriptionId === "string" ? req.query.subscriptionId : undefined;
      sendSuccess(res, { incidents: await this.incidents.list(subscriptionId) });
    } catch (error) {
      next(error);
    }
  };

  resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await this.incidents.resolve(req.params.incidentId);
      sendSuccess(res, { incident }, "Incident resolved");
    } catch (error) {
      next(error);
    }
  };
}

export class LoginCodeController {
  constructor(private inbox: InboxService) {}

  listUnmatched = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      sendSuccess(res, { loginCodes: await this.inbox.listUnmatched() });
    } catch (error) {
      next(error);
    }
  };
}
