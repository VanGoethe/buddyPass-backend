import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { MailUnavailableError } from "../../utils/errors";

export interface IMailer {
  isConfigured(): boolean;
  send(to: string, subject: string, body: string): Promise<void>;
  sendOrThrow(to: string, subject: string, body: string): Promise<void>;
}

export class SmtpMailer implements IMailer {
  isConfigured(): boolean {
    if (env.NODE_ENV === "test") {
      return false;
    }
    return Boolean(env.SMTP_HOST && env.SMTP_FROM);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    try {
      await this.deliver(to, subject, body);
    } catch (error) {
      logger.error({ err: error, to }, "Outbound notice email failed");
    }
  }

  async sendOrThrow(to: string, subject: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new MailUnavailableError();
    }
    try {
      await this.deliver(to, subject, body);
    } catch (error) {
      logger.error({ err: error, to }, "Outbound auth email failed");
      throw new MailUnavailableError();
    }
  }

  private async deliver(to: string, subject: string, body: string): Promise<void> {
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
  }
}
