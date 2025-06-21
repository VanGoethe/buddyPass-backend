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
 * Get the appropriate rate limiting configuration based on environment
 */
export declare const getRateLimitConfig: () => RateLimitConfigs;
/**
 * Current active rate limiting configuration
 */
export declare const rateLimitConfig: RateLimitConfigs;
/**
 * Helper function to get rate limit config for a specific endpoint
 */
export declare const getRateLimitForEndpoint: (endpointType: keyof RateLimitConfigs) => RateLimitConfig;
/**
 * Environment information for logging/debugging
 */
export declare const rateLimitEnvironment: {
    isTest: boolean;
    isDevelopment: boolean;
    isProduction: boolean;
    currentEnv: string;
};
//# sourceMappingURL=rateLimiting.d.ts.map