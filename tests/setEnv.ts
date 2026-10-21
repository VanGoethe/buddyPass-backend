import dotenv from "dotenv";

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "test";

const configuredDatabaseUrl = process.env.DATABASE_URL || "";
const databaseUrlIsPlaceholder =
  configuredDatabaseUrl.length === 0 ||
  configuredDatabaseUrl.includes("username:password");

process.env.DATABASE_URL = databaseUrlIsPlaceholder
  ? "postgresql://postgres:postgres@localhost:5432/buddypass_test"
  : configuredDatabaseUrl;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "test-jwt-secret-must-be-at-least-32-chars";
}
if (
  !process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_REFRESH_SECRET.length < 32
) {
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-must-be-32-characters-long";
}
if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
  process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
    "base64"
  );
}
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client";
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "test-google-secret";
process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:3000/api/users/auth/google/callback";
