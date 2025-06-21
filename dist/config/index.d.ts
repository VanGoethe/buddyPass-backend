/**
 * Configuration module exports
 */
export * from "./database";
export * from "./rateLimiting";
/**
 * Application configuration constants
 */
export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly databaseUrl: string;
    readonly jwtSecret: string;
    readonly corsOrigin: string;
};
//# sourceMappingURL=index.d.ts.map