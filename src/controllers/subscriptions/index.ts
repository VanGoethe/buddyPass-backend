import { NextFunction, Request, Response } from "express";
import { ISubscriptionService } from "../../types/subscriptions";
import { UserRole } from "../../types/users";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError } from "../../utils/errors";

export class SubscriptionController {
  constructor(private subscriptionService: ISubscriptionService) {}

  createSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body as {
        expiresAt?: string;
        currencyId?: string;
        currency?: string;
      };
      const subscription = await this.subscriptionService.createSubscription({
        ...req.body,
        currencyId: body.currencyId ?? body.currency,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });
      sendSuccess(res, subscription, "Subscription created successfully", 201);
    } catch (error) {
      next(error);
    }
  };

  getSubscriptionById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscription = await this.subscriptionService.getSubscriptionById(
        req.params.id
      );
      sendSuccess(res, subscription);
    } catch (error) {
      next(error);
    }
  };

  getSubscriptions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.subscriptionService.getSubscriptions(req.query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body as { expiresAt?: string };
      const subscription = await this.subscriptionService.updateSubscription(
        req.params.id,
        {
          ...req.body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        }
      );
      sendSuccess(res, subscription, "Subscription updated successfully");
    } catch (error) {
      next(error);
    }
  };

  deleteSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.subscriptionService.deleteSubscription(req.params.id);
      sendSuccess(res, null, "Subscription deleted successfully");
    } catch (error) {
      next(error);
    }
  };

  getSubscriptionsByServiceProvider = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscriptions =
        await this.subscriptionService.getSubscriptionsByServiceProvider(
          req.params.serviceProviderId
        );
      sendSuccess(res, subscriptions);
    } catch (error) {
      next(error);
    }
  };

  requestSubscriptionSlot = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const request = await this.subscriptionService.requestSubscriptionSlot(
        req.user.id,
        req.body
      );
      const message =
        request.status === "ASSIGNED"
          ? "Slot successfully assigned! You now have access to this subscription."
          : "All subscription slots are currently full. Your request is queued.";
      sendSuccess(res, { request }, message);
    } catch (error) {
      next(error);
    }
  };

  getUserSubscriptionSlots = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const slots = await this.subscriptionService.getUserSubscriptionSlots(
        req.user.id
      );
      sendSuccess(res, { slots }, "User subscription slots retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  listMyRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const requests = await this.subscriptionService.listMyRequests(req.user.id);
      sendSuccess(res, { requests });
    } catch (error) {
      next(error);
    }
  };

  revealCredentials = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const credentials = await this.subscriptionService.revealCredentials(
        req.params.slotId,
        { id: req.user.id, role: req.user.role as UserRole }
      );
      res.set("Cache-Control", "no-store");
      sendSuccess(res, credentials);
    } catch (error) {
      next(error);
    }
  };

  releaseSlot = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      await this.subscriptionService.releaseSlot(req.params.slotId, {
        id: req.user.id,
        role: req.user.role as UserRole,
      });
      sendSuccess(res, null, "Slot released");
    } catch (error) {
      next(error);
    }
  };
}

export function createSubscriptionController(
  subscriptionService: ISubscriptionService
): SubscriptionController {
  return new SubscriptionController(subscriptionService);
}
