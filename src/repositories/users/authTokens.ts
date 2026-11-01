import { AuthTokenPurpose, PrismaClient } from "@prisma/client";
import { hashRefreshToken, generateRefreshToken } from "./refreshTokens";
import { ValidationError } from "../../utils/errors";

export const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

export class PrismaAuthTokenRepository {
  constructor(private prisma: PrismaClient) {}

  async issue(userId: string, purpose: AuthTokenPurpose, ttlMs: number): Promise<string> {
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    await this.prisma.$transaction(async (tx) => {
      await tx.authToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.authToken.create({
        data: {
          userId,
          purpose,
          tokenHash,
          expiresAt: new Date(Date.now() + ttlMs),
        },
      });
    });
    return rawToken;
  }

  async consume(rawToken: string, purpose: AuthTokenPurpose): Promise<string> {
    const tokenHash = hashRefreshToken(rawToken);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.authToken.findUnique({ where: { tokenHash } });
      if (
        !row ||
        row.purpose !== purpose ||
        row.usedAt !== null ||
        row.expiresAt.getTime() <= Date.now()
      ) {
        throw new ValidationError(
          "This link is invalid or has expired",
          undefined,
          "INVALID_TOKEN"
        );
      }
      const updated = await tx.authToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new ValidationError(
          "This link is invalid or has expired",
          undefined,
          "INVALID_TOKEN"
        );
      }
      return row.userId;
    });
  }
}
