import { IMailer } from "../../src/services/mail/smtpMailer";
import { MailUnavailableError } from "../../src/utils/errors";

export class RecordingMailer implements IMailer {
  readonly messages: { to: string; subject: string; body: string }[] = [];
  configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.configured) return;
    this.messages.push({ to, subject, body });
  }

  async sendOrThrow(to: string, subject: string, body: string): Promise<void> {
    if (!this.configured) throw new MailUnavailableError();
    this.messages.push({ to, subject, body });
  }
}

export function tokenFromMessage(body: string): string {
  const match = body.match(/token=([^&\s]+)/);
  if (!match) throw new Error("mail body has no token");
  return decodeURIComponent(match[1]);
}
