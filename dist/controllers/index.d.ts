import { Request, Response, NextFunction } from "express";
/**
 * Base controller class with common functionality
 */
export declare abstract class BaseController {
    /**
     * Send success response
     */
    protected sendSuccess(res: Response, data: any, message?: string, statusCode?: number): void;
    /**
     * Send error response
     */
    protected sendError(res: Response, message: string, statusCode?: number, error?: any): void;
    /**
     * Async handler wrapper for error handling
     */
    protected asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
}
/**
 * Controllers Export
 */
export * from "./users";
//# sourceMappingURL=index.d.ts.map