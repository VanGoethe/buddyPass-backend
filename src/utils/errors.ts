import { Prisma } from "@prisma/client";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND") {
    super(code, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT", details?: unknown) {
    super(code, message, 409, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Request validation failed",
    details?: unknown,
    code = "VALIDATION_ERROR"
  ) {
    super(code, message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that", code = "FORBIDDEN") {
    super(code, message, 403);
  }
}

export function mapPrismaError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new ConflictError("A record with that value already exists");
    }
    if (error.code === "P2025") {
      return new NotFoundError("Record not found");
    }
    if (error.code === "P2003") {
      return new ValidationError("Related record does not exist");
    }
  }
  return null;
}
