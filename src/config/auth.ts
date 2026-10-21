import { env } from "./env";
import type { SignOptions } from "jsonwebtoken";

export const ACCESS_TOKEN_ISSUER = "buddypass";
export const ACCESS_TOKEN_AUDIENCE = "buddypass-api";

export const authConfig = {
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  },
  bcrypt: {
    saltRounds: 12,
  },
} as const;

export const accessTokenSignOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  issuer: ACCESS_TOKEN_ISSUER,
  audience: ACCESS_TOKEN_AUDIENCE,
  algorithm: "HS256",
};
