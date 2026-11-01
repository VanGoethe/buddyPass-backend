import { NextFunction, Request, Response } from "express";
import { PaymentMethod, PaymentStatus, PaymentVerification } from "@prisma/client";
import { PaymentService, StartPaymentInput } from "../../services/payments";
import { verifyIhellaSignature } from "../../services/payments/signature";
import { env } from "../../config/env";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError, ValidationError } from "../../utils/errors";

interface StartPaymentBody {
  verification?: "MANUAL" | "ONLINE";
  method?: PaymentMethod;
  confirmationNote?: string;
}

function startInput(body: StartPaymentBody): StartPaymentInput {
  if (body.verification === "MANUAL") {
    return {
      verification: "MANUAL",
      method: body.method ?? null,
      confirmationNote: body.confirmationNote ?? null,
    };
  }
  if (!body.method) {
    throw new ValidationError("An online payment needs a method");
  }
  return {
    verification: "ONLINE",
    method: body.method,
    confirmationNote: null,
  };
}

export class PaymentController {
  constructor(private payments: PaymentService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const payment = await this.payments.createForSlot(
        req.params.slotId,
        req.user.id,
        startInput(req.body as StartPaymentBody)
      );
      sendSuccess(res, { payment }, "Payment recorded", 201);
    } catch (error) {
      next(error);
    }
  };

  setConfirmation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const payment = await this.payments.setConfirmationNote(
        req.params.paymentId,
        req.user.id,
        req.body.confirmationNote as string
      );
      sendSuccess(res, { payment }, "Payment confirmation saved");
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const verification = req.query.verification as PaymentVerification | undefined;
      const status = req.query.status as PaymentStatus | undefined;
      sendSuccess(res, {
        payments: await this.payments.list({
          verification: verification || undefined,
          status: status || undefined,
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  awaiting = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, { payments: await this.payments.listAwaitingAdmin() });
    } catch (error) {
      next(error);
    }
  };

  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.payments.confirm(req.params.paymentId);
      sendSuccess(res, { payment }, "Payment confirmed");
    } catch (error) {
      next(error);
    }
  };

  fail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.payments.fail(req.params.paymentId);
      sendSuccess(res, { payment }, "Payment failed");
    } catch (error) {
      next(error);
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!env.IHELLA_WEBHOOK_SECRET) {
        throw new ValidationError("Ihella webhook is not configured");
      }
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const signature = req.header("x-ihella-signature") ?? undefined;
      if (!verifyIhellaSignature(raw, signature, env.IHELLA_WEBHOOK_SECRET)) {
        throw new UnauthorizedError("Invalid webhook signature", "INVALID_SIGNATURE");
      }
      const parsed: unknown = JSON.parse(raw.toString("utf8"));
      const providerRef =
        typeof parsed === "object" &&
        parsed !== null &&
        "providerRef" in parsed &&
        typeof parsed.providerRef === "string"
          ? parsed.providerRef
          : null;
      if (!providerRef) {
        throw new ValidationError("providerRef is required");
      }
      const payment = await this.payments.confirmByProviderRef(providerRef);
      sendSuccess(res, { payment });
    } catch (error) {
      next(error);
    }
  };
}
