import request from "supertest";
import App from "../../../src/app";
import { getPrismaClient } from "../../../src/config/database";
import { PrismaUserRepository } from "../../../src/repositories/users";
import { UserService } from "../../../src/services/users";
import { RecordingMailer, tokenFromMessage } from "../../utils/recordingMailer";
import { withTestCleanup } from "../../utils/testCleanup";

const app = new App().app;

function users(mailer: RecordingMailer): UserService {
  const prisma = getPrismaClient();
  return new UserService(new PrismaUserRepository(prisma), prisma, mailer);
}

describe("password reset", () => {
  it(
    "resets the password, revokes refresh tokens, and does not open a session",
    withTestCleanup(async (cleanup) => {
      const mailer = new RecordingMailer();
      const email = `reset-${Date.now()}@example.com`;
      const registered = await users(mailer).register({
        email,
        password: "password123",
        name: "Reset User",
      });
      cleanup.trackUser(registered.user.id);

      await users(mailer).forgotPassword(email);
      const token = tokenFromMessage(mailer.messages.at(-1)!.body);
      const reset = await request(app)
        .post("/api/users/reset-password")
        .send({ token, password: "Newpassword1!" });

      expect(reset.status).toBe(200);
      expect(reset.body.data).toBeNull();

      const reused = await request(app)
        .post("/api/users/refresh")
        .send({ refreshToken: registered.refreshToken });
      expect(reused.status).toBe(401);

      const login = await request(app)
        .post("/api/users/login")
        .send({ email, password: "Newpassword1!" });
      expect(login.status).toBe(200);
    })
  );

  it(
    "answers the same way when the address is unknown",
    withTestCleanup(async (cleanup) => {
      const mailer = new RecordingMailer();
      await users(mailer).forgotPassword(`missing-${Date.now()}@example.com`);
      const known = await users(mailer).register({
        email: `known-${Date.now()}@example.com`,
        password: "password123",
        name: "Known",
      });
      cleanup.trackUser(known.user.id);
      await users(mailer).forgotPassword(known.user.email);

      expect(mailer.messages.filter((item) => item.subject.includes("Reset"))).toHaveLength(1);
    })
  );

  it(
    "returns 503 before looking up the address when mail is not configured",
    withTestCleanup(async () => {
      const mailer = new RecordingMailer();
      mailer.configured = false;
      await expect(users(mailer).forgotPassword("anyone@example.com")).rejects.toMatchObject({
        code: "MAIL_UNAVAILABLE",
      });
    })
  );
});
