import { Response } from "express";

export function sendSuccess(
  res: Response,
  data: unknown,
  message?: string,
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
}
