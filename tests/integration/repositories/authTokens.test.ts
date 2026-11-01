import { AuthTokenPurpose } from "@prisma/client";
import {
  PrismaAuthTokenRepository,
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_TTL_MS,
} from "../../../src/repositories/users/authTokens";
import { ValidationError } from "../../../src/utils/errors";
import { getPrismaClient } from "../../../src/config/database";
import { withTestCleanup } from "../../utils/testCleanup";

describe("AuthTokenRepository", () => {
  const repository = new PrismaAuthTokenRepository(getPrismaClient());

  it(
    "issues one live token and rejects a second use",
    withTestCleanup(async (cleanup) => {
      const user = await getPrismaClient().user.create({
        data: {
          email: `auth-token-${Date.now()}@example.com`,
          name: "Token User",
          password: "hash",
        },
      });
      cleanup.trackUser(user.id);

      const first = await repository.issue(
        user.id,
        AuthTokenPurpose.VERIFY_EMAIL,
        VERIFY_EMAIL_TTL_MS
      );
      const second = await repository.issue(
        user.id,
        AuthTokenPurpose.VERIFY_EMAIL,
        VERIFY_EMAIL_TTL_MS
      );
      const userId = await repository.consume(second, AuthTokenPurpose.VERIFY_EMAIL);

      expect(userId).toBe(user.id);
      await expect(repository.consume(second, AuthTokenPurpose.VERIFY_EMAIL)).rejects.toBeInstanceOf(
        ValidationError
      );
      await expect(repository.consume(first, AuthTokenPurpose.VERIFY_EMAIL)).rejects.toBeInstanceOf(
        ValidationError
      );
    })
  );

  it(
    "rejects an expired token",
    withTestCleanup(async (cleanup) => {
      const user = await getPrismaClient().user.create({
        data: {
          email: `auth-expired-${Date.now()}@example.com`,
          name: "Expired",
          password: "hash",
        },
      });
      cleanup.trackUser(user.id);
      const raw = await repository.issue(
        user.id,
        AuthTokenPurpose.RESET_PASSWORD,
        RESET_PASSWORD_TTL_MS
      );
      await getPrismaClient().authToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(repository.consume(raw, AuthTokenPurpose.RESET_PASSWORD)).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    })
  );
});
