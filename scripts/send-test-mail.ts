#!/usr/bin/env ts-node

import nodemailer from "nodemailer";
import { env } from "../src/config/env";
import { logger } from "../src/utils/logger";

async function sendTestMail(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    logger.error("Usage: npm run mail:test -- you@example.com");
    process.exit(1);
  }
  if (!env.SMTP_HOST || !env.SMTP_FROM || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    logger.error(
      "SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be set"
    );
    process.exit(1);
  }

  const port = env.SMTP_PORT ?? 587;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "BuddyPass SMTP test",
    text: "BuddyPass can send mail through the configured SMTP relay.",
  });
  logger.info({ to, host: env.SMTP_HOST }, "Test email sent");
}

sendTestMail().catch((error: unknown) => {
  logger.error({ err: error }, "Test email failed");
  process.exit(1);
});
