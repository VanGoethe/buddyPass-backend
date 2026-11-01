import request from "supertest";
import App from "../../../src/app";
import { getPrismaClient } from "../../../src/config/database";
import { PrismaUserRepository } from "../../../src/repositories/users";
import { UserService } from "../../../src/services/users";
import { signAccessToken } from "../../utils/accessToken";
import { RecordingMailer, tokenFromMessage } from "../../utils/recordingMailer";
import { withTestCleanup } from "../../utils/testCleanup";

const app = new App().app;

function service(mailer: RecordingMailer): UserService {
  const prisma = getPrismaClient();
  return new UserService(new PrismaUserRepository(prisma), prisma, mailer);
}

describe("email verification", () => {
  it(
    "sends a link on register and confirms it once",
    withTestCleanup(async (cleanup) => {
      const mailer = new RecordingMailer();
      const email = `verify-${Date.now()}@example.com`;
      const registered = await service(mailer).register({
        email,
        password: "password123",
        name: "Verify User",
      });
      cleanup.trackUser(registered.user.id);

      expect(registered.verificationEmailSent).toBe(true);
      expect(mailer.messages).toHaveLength(1);
      const token = tokenFromMessage(mailer.messages[0].body);

      const confirmed = await request(app).post("/api/users/verify-email").send({ token });
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.data.user.isVerified).toBe(true);

      const again = await request(app).post("/api/users/verify-email").send({ token });
      expect(again.status).toBe(400);
      expect(again.body.error.code).toBe("INVALID_TOKEN");
    })
  );

  it(
    "refuses a second verification email after the address is confirmed",
    withTestCleanup(async (cleanup) => {
      const mailer = new RecordingMailer();
      const registered = await service(mailer).register({
        email: `verified-${Date.now()}@example.com`,
        password: "password123",
        name: "Already Verified",
      });
      cleanup.trackUser(registered.user.id);
      await service(mailer).verifyEmail(tokenFromMessage(mailer.messages[0].body));

      const resend = await request(app)
        .post("/api/users/verification-email")
        .set("Authorization", `Bearer ${signAccessToken(registered.user.id)}`);

      expect(resend.status).toBe(409);
      expect(resend.body.error.code).toBe("ALREADY_VERIFIED");
    })
  );

  it(
    "returns 503 when outbound mail is not configured",
    withTestCleanup(async (cleanup) => {
      const mailer = new RecordingMailer();
      const registered = await service(mailer).register({
        email: `no-mail-${Date.now()}@example.com`,
        password: "password123",
        name: "No Mail",
      });
      cleanup.trackUser(registered.user.id);
      mailer.configured = false;

      await expect(service(mailer).sendVerificationEmail(registered.user.id)).rejects.toMatchObject({
        statusCode: 503,
        code: "MAIL_UNAVAILABLE",
      });
    })
  );
});
