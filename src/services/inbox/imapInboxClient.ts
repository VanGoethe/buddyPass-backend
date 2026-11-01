import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

export interface InboundMail {
  recipients: string[];
  from: string | null;
  receivedAt: Date;
  text: string;
}

export interface IInboxClient {
  fetchUnseen(): Promise<InboundMail[]>;
}

export interface ImapInboxConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export function inboxIsConfigured(
  config: ImapInboxConfig = {
    host: env.IMAP_HOST,
    user: env.IMAP_USER,
    password: env.IMAP_PASSWORD,
  }
): boolean {
  return Boolean(config.host && config.user && config.password);
}

function emailsIn(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+/g) ?? [];
}

function addressList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  const entries = Array.isArray(value) ? value : [value];
  const addresses: string[] = [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      addresses.push(...emailsIn(entry));
      continue;
    }
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as { text?: string; value?: Array<{ address?: string }> };
    const fromValues = (record.value ?? [])
      .map((item) => item.address)
      .filter((address): address is string => typeof address === "string");
    if (fromValues.length > 0) {
      addresses.push(...fromValues.flatMap((address) => emailsIn(address)));
    } else if (record.text) {
      addresses.push(...emailsIn(record.text));
    }
  }
  return addresses;
}

function headerList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => emailsIn(String(entry)));
}

export class ImapInboxClient implements IInboxClient {
  constructor(private config?: ImapInboxConfig) {}

  async fetchUnseen(): Promise<InboundMail[]> {
    const host = this.config?.host ?? env.IMAP_HOST;
    const user = this.config?.user ?? env.IMAP_USER;
    const password = this.config?.password ?? env.IMAP_PASSWORD;
    const port = this.config?.port ?? env.IMAP_PORT ?? 993;
    if (!host || !user || !password) {
      return [];
    }
    const client = new ImapFlow({
      host,
      port,
      secure: true,
      auth: { user, pass: password },
      logger: false,
    });
    const found: InboundMail[] = [];
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const uidClient = client as unknown as {
      search(
        query: { seen: boolean },
        options: { uid: boolean }
      ): Promise<number[] | false>;
      fetchOne(
        seq: string,
        query: { source: boolean; internalDate: boolean },
        options: { uid: boolean }
      ): Promise<{ source?: Buffer; internalDate?: Date } | false>;
    };
    try {
      const listed = await uidClient.search({ seen: false }, { uid: true });
      const ids = Array.isArray(listed) ? listed : [];
      for (const uid of ids) {
        const message = await uidClient.fetchOne(
          String(uid),
          { source: true, internalDate: true },
          { uid: true }
        );
        if (!message || !message.source) {
          continue;
        }
        const parsed = await simpleParser(message.source);
        const recipients = [
          ...addressList(parsed.to),
          ...addressList(parsed.cc),
          ...headerList(parsed.headers.get("delivered-to")),
        ];
        const fromAddress = addressList(parsed.from)[0] ?? null;
        const internalDate =
          "internalDate" in message && message.internalDate instanceof Date
            ? message.internalDate
            : null;
        found.push({
          recipients: [...new Set(recipients)],
          from: fromAddress,
          receivedAt: internalDate ?? new Date(),
          text: parsed.text ?? "",
        });
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      }
    } catch (error) {
      logger.error({ err: error }, "IMAP inbox poll failed");
    } finally {
      lock.release();
      await client.logout();
    }
    return found;
  }
}
