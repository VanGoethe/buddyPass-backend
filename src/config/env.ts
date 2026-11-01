import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalPort = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  CREDENTIALS_ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:3000/api/users/auth/google/callback"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  REDIS_URL: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  ADMIN_EMAIL: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  ADMIN_PASSWORD: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  ADMIN_NAME: z.string().optional(),
  SEAT_PAYMENT_HOLD_HOURS: z.coerce.number().int().positive().default(24),
  SEAT_BLOCK_GRACE_DAYS: z.coerce.number().int().positive().default(3),
  INBOX_DOMAIN: optionalText,
  IMAP_HOST: optionalText,
  IMAP_PORT: optionalPort,
  IMAP_USER: optionalText,
  IMAP_PASSWORD: optionalText,
  LOGIN_CODE_WATCH_SECONDS: z.coerce.number().int().positive().default(300),
  LOGIN_CODE_WATCH_INTERVAL_SECONDS: z.coerce.number().int().positive().default(5),
  LOGIN_CODE_CLOCK_SKEW_SECONDS: z.coerce.number().int().nonnegative().default(30),
  LOGIN_CODE_TURN_ESTIMATE_SECONDS: z.coerce.number().int().positive().default(45),
  SMTP_HOST: optionalText,
  SMTP_PORT: optionalPort,
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: optionalText,
  APP_PUBLIC_URL: optionalText,
  IHELLA_API_BASE_URL: optionalText,
  IHELLA_API_KEY: optionalText,
  IHELLA_WEBHOOK_SECRET: optionalText,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const key = Buffer.from(parsed.data.CREDENTIALS_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  }

  const firstOrigin = parsed.data.CORS_ORIGIN.split(",")[0]?.trim() || "http://localhost:3000";
  return {
    ...parsed.data,
    APP_PUBLIC_URL: parsed.data.APP_PUBLIC_URL ?? firstOrigin,
  };
}

export const env: Env = loadEnv();
