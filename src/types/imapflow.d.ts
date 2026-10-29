declare module "imapflow" {
  export class ImapFlow {
    constructor(options: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
      logger: false;
    });
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(mailbox: string): Promise<{ release(): void }>;
    search(query: { seen: boolean }): Promise<number[] | false>;
    fetchOne(
      uid: string,
      query: { source: boolean; envelope: boolean }
    ): Promise<{ source?: Buffer } | false>;
    messageFlagsAdd(
      uid: string,
      flags: string[],
      options: { uid: boolean }
    ): Promise<void>;
  }
}
