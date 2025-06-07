import { Request, Response, NextFunction } from "express";

/**
 * Base controller class with common functionality
 */
export abstract class BaseController {
  /**
   * Send success response
   */
  protected sendSuccess(
    res: Response,
    data: any,
    message?: string,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      message: message || "Operation successful",
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 400,
    error?: any
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Async handler wrapper for error handling
   */
  protected asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}

/**
 * Controllers Export
 */

// Export user controllers following clean architecture
export * from "./users";

// Export other controllers
// ... add other controller exports here as needed
