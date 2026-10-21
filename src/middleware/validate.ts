import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { ValidationError } from "../utils/errors";

export const validate =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const error = result.error;
      const details =
        error instanceof ZodError
          ? error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            }))
          : undefined;
      next(new ValidationError("Request validation failed", details));
      return;
    }

    const parsed = result.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.query !== undefined) {
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params !== undefined) {
      Object.assign(req.params, parsed.params);
    }
    next();
  };
