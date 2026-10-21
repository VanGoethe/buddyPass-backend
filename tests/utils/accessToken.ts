import jwt from "jsonwebtoken";

export function signAccessToken(
  userId: string,
  role: "USER" | "ADMIN" = "USER"
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return jwt.sign({ userId, role }, secret, {
    algorithm: "HS256",
    issuer: "buddypass",
    audience: "buddypass-api",
    expiresIn: "15m",
  });
}
