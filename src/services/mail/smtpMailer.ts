import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

export interface IMailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class SmtpMailer implements IMailer {
  async send(to: string, subject: string, body: string): Promise<void> {
    if (!env.SMTP_HOST || !env.SMTP_FROM) {
      return;
    }
    try {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASSWORD
            ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
            : undefined,
      });
      await transport.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text: body,
      });
    } catch (error) {
      logger.error({ err: error, to }, "Outbound notice email failed");
    }
  }
}
