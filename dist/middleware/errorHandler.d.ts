import { Request, Response, NextFunction } from "express";
/**
 * Custom error class
 */
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
/**
 * Global error handling middleware
 */
export declare const errorHandler: (error: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map