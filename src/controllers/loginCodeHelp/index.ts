import { NextFunction, Request, Response } from "express";
import { LoginCodeQueue } from "../../services/loginCodes";
import { LoginCodeHelpService } from "../../services/loginCodeHelp";
import { sendSuccess } from "../../utils/http";
import { UnauthorizedError } from "../../utils/errors";

export class LoginCodeHelpController {
  constructor(
    private queue: LoginCodeQueue,
    private help: LoginCodeHelpService
  ) {}

  requestCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      res.set("Cache-Control", "no-store");
      const result = await this.queue.request(req.user.id, req.params.slotId);
      sendSuccess(res, result, undefined, 202);
    } catch (error) {
      next(error);
    }
  };

  requestHelp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      res.set("Cache-Control", "no-store");
      const result = await this.help.request(req.user.id, req.params.slotId);
      sendSuccess(
        res,
        { help: result.help },
        result.created ? "Admins have been told" : "This request is already open",
        result.created ? 201 : 200
      );
    } catch (error) {
      next(error);
    }
  };

  listHelp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.status === "RESOLVED" ? "RESOLVED" : "OPEN";
      sendSuccess(res, { help: await this.help.list(status) });
    } catch (error) {
      next(error);
    }
  };

  enterCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      res.set("Cache-Control", "no-store");
      const code = typeof req.body.code === "string" ? req.body.code : "";
      await this.help.enterCode(req.params.slotId, code, req.user.id);
      sendSuccess(res, { sent: true }, "Verification code sent", 201);
    } catch (error) {
      next(error);
    }
  };
}
