import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { parseLoginMessage } from "./parseLoginMessage";

export interface InboundLoginMessage {
  alias: string | null;
  code: string | null;
  receivedAt: Date;
}

export interface IInboxClient {
  fetchUnseen(): Promise<InboundLoginMessage[]>;
}

function addressList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  const entries = Array.isArray(value) ? value : [value];
  const addresses: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as { text?: string; value?: Array<{ address?: string }> };
    const fromValues = (record.value ?? [])
      .map((item) => item.address)
      .filter((address): address is string => typeof address === "string");
    if (fromValues.length > 0) {
      addresses.push(...fromValues);
    } else if (record.text) {
      addresses.push(record.text);
    }
  }
  return addresses;
}

export class ImapInboxClient implements IInboxClient {
  async fetchUnseen(): Promise<InboundLoginMessage[]> {
    if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASSWORD) {
      return [];
    }
    const client = new ImapFlow({
      host: env.IMAP_HOST,
      port: env.IMAP_PORT ?? 993,
      secure: true,
      auth: { user: env.IMAP_USER, pass: env.IMAP_PASSWORD },
      logger: false,
    });
    const found: InboundLoginMessage[] = [];
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false });
      const ids = Array.isArray(uids) ? uids : [];
      for (const uid of ids) {
        const message = await client.fetchOne(String(uid), {
          source: true,
          envelope: true,
        });
        if (!message || !message.source) {
          continue;
        }
        const parsed = await simpleParser(message.source);
        const delivered = parsed.headers.get("delivered-to");
        const deliveredTo = Array.isArray(delivered)
          ? delivered.map(String)
          : delivered
            ? [String(delivered)]
            : [];
        const text = parsed.text ?? "";
        const result = parseLoginMessage({
          to: addressList(parsed.to),
          deliveredTo,
          text,
          domain: env.INBOX_DOMAIN,
        });
        found.push({
          alias: result.alias,
          code: result.code,
          receivedAt: parsed.date ?? new Date(),
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
