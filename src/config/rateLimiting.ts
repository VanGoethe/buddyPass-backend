/**
 * Rate Limiting Configuration
 * Centralized configuration for all rate limiting across the application
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  description: string;
}

export interface RateLimitConfigs {
  login: RateLimitConfig;
  register: RateLimitConfig;
  passwordChange: RateLimitConfig;
  general: RateLimitConfig;
  admin: RateLimitConfig;
}

/**
 * Environment-specific rate limiting configurations
 */
const isTestEnv = process.env.NODE_ENV === "test";
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Production rate limiting configuration
 */
const productionConfig: RateLimitConfigs = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: "5 login attempts per 15 minutes",
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    description: "3 registration attempts per hour",
  },
  passwordChange: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    description: "3 password change attempts per hour",
  },
  general: {
    maxAttempts: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: "100 requests per 15 minutes",
  },
  admin: {
    maxAttempts: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: "50 admin requests per 15 minutes",
  },
};

/**
 * Development rate limiting configuration
 * More lenient for development workflow
 */
const developmentConfig: RateLimitConfigs = {
  login: {
    maxAttempts: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    description: "20 login attempts per 5 minutes (development)",
  },
  register: {
    maxAttempts: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    description: "10 registration attempts per 10 minutes (development)",
  },
  passwordChange: {
    maxAttempts: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    description: "10 password change attempts per 10 minutes (development)",
  },
  general: {
    maxAttempts: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: "1000 requests per 15 minutes (development)",
  },
  admin: {
    maxAttempts: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    description: "200 admin requests per 15 minutes (development)",
  },
};

/**
 * Test environment rate limiting configuration
 * Very lenient limits to prevent test failures
 */
const testConfig: RateLimitConfigs = {
  login: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    description: "100 login attempts per minute (test)",
  },
  register: {
    maxAttempts: 50,
    windowMs: 60 * 1000, // 1 minute
    description: "50 registration attempts per minute (test)",
  },
  passwordChange: {
    maxAttempts: 50,
    windowMs: 60 * 1000, // 1 minute
    description: "50 password change attempts per minute (test)",
  },
  general: {
    maxAttempts: 10000,
    windowMs: 60 * 1000, // 1 minute
    description: "10000 requests per minute (test)",
  },
  admin: {
    maxAttempts: 1000,
    windowMs: 60 * 1000, // 1 minute
    description: "1000 admin requests per minute (test)",
  },
};

/**
 * Get the appropriate rate limiting configuration based on environment
 */
export const getRateLimitConfig = (): RateLimitConfigs => {
  if (isTestEnv) {
    return testConfig;
  }
  if (isDevelopment) {
    return developmentConfig;
  }
  return productionConfig;
};

/**
 * Current active rate limiting configuration
 */
export const rateLimitConfig = getRateLimitConfig();

/**
 * Helper function to get rate limit config for a specific endpoint
 */
export const getRateLimitForEndpoint = (
  endpointType: keyof RateLimitConfigs
): RateLimitConfig => {
  return rateLimitConfig[endpointType];
};

/**
 * Environment information for logging/debugging
 */
export const rateLimitEnvironment = {
  isTest: isTestEnv,
  isDevelopment: isDevelopment,
  isProduction: !isTestEnv && !isDevelopment,
  currentEnv: process.env.NODE_ENV || "development",
};
