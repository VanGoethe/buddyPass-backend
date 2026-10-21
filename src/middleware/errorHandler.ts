import { Request, Response, NextFunction } from "express";
import { AppError, mapPrismaError } from "../utils/errors";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const mapped = mapPrismaError(error);
  const appError = mapped ?? (error instanceof AppError ? error : null);

  if (!appError) {
    logger.error({ err: error, path: req.path, method: req.method }, "Unhandled error");
  }

  const statusCode = appError?.statusCode ?? 500;
  const code = appError?.code ?? "INTERNAL_ERROR";
  const message = appError?.message ?? "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(appError?.details !== undefined ? { details: appError.details } : {}),
    },
  });
};
