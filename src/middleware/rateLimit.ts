import { Request, Response, NextFunction } from "express";
import rateLimit, { Options, Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { env } from "../config/env";
import { getRateLimitForEndpoint } from "../config/rateLimiting";
import { logger } from "../utils/logger";

let redisClient: Redis | undefined;

function buildStore(prefix: string): Store | undefined {
  if (!env.REDIS_URL) {
    return undefined;
  }
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redisClient.on("error", (error: Error) => {
      logger.error({ err: error }, "Redis rate limit store error");
    });
  }
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      redisClient!.call(command, ...args) as Promise<number | string>,
  });
}

function rateLimitResponse(
  _req: Request,
  res: Response,
  _next: NextFunction,
  options: Options
): void {
  const retryAfter = Math.ceil(options.windowMs / 1000);
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      details: { retryAfter },
    },
  });
}

export function createRateLimiter(
  maxAttempts: number,
  windowMs: number,
  prefix: string
): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore(prefix),
    handler: rateLimitResponse,
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
    validate: { trustProxy: false, xForwardedForHeader: false },
  });
}

export const authRateLimit = (
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): ReturnType<typeof rateLimit> =>
  createRateLimiter(maxAttempts, windowMs, "auth");

const general = getRateLimitForEndpoint("general");
const login = getRateLimitForEndpoint("login");
const register = getRateLimitForEndpoint("register");
const passwordChange = getRateLimitForEndpoint("passwordChange");
const admin = getRateLimitForEndpoint("admin");

export const globalRateLimiter = createRateLimiter(
  general.maxAttempts,
  general.windowMs,
  "global"
);
export const loginRateLimiter = createRateLimiter(
  login.maxAttempts,
  login.windowMs,
  "login"
);
export const registerRateLimiter = createRateLimiter(
  register.maxAttempts,
  register.windowMs,
  "register"
);
export const passwordChangeRateLimiter = createRateLimiter(
  passwordChange.maxAttempts,
  passwordChange.windowMs,
  "password"
);
export const adminRateLimiter = createRateLimiter(
  admin.maxAttempts,
  admin.windowMs,
  "admin"
);
export const credentialRevealRateLimiter = createRateLimiter(
  env.NODE_ENV === "test" ? 1000 : 10,
  15 * 60 * 1000,
  "credentials"
);
