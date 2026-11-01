import { InboxService, ILoginCodeClaims } from "../../../src/services/inbox";
import { IInboxClient, InboundMail } from "../../../src/services/inbox/imapInboxClient";
import { INotificationPublisher, LoginCodePush } from "../../../src/realtime";
import { ISeatAccess } from "../../../src/services/payments";

jest.mock("../../../src/config/env", () => ({
  env: {
    INBOX_DOMAIN: "codes.example",
    LOGIN_CODE_CLOCK_SKEW_SECONDS: 30,
  },
}));

const receivedAt = new Date("2026-11-01T12:00:00.000Z");
const activatedAt = new Date("2026-11-01T11:59:00.000Z");

function publisher() {
  const codes: Array<{ userId: string; view: LoginCodePush }> = [];
  const adminCodes: LoginCodePush[] = [];
  const fake = {
    codes,
    adminCodes,
    publishNotification() {
      return undefined;
    },
    publishLoginCode(userId: string, view: LoginCodePush) {
      codes.push({ userId, view });
    },
    publishSeatReady() {
      return undefined;
    },
    publishLoginCodeStatus() {
      return undefined;
    },
    publishLoginCodeMissed() {
      return undefined;
    },
    publishToAdmins(_event: string, payload: LoginCodePush) {
      adminCodes.push(payload);
    },
    attach() {
      return undefined;
    },
    async close() {
      return undefined;
    },
  };
  return fake as INotificationPublisher & typeof fake;
}

function mail(overrides: Partial<InboundMail>): InboundMail {
  return {
    recipients: ["you+netflix1@gmail.com"],
    from: "info@account.netflix.com",
    receivedAt,
    text: "Your code is 482913",
    ...overrides,
  };
}

function inboxFor(input: {
  message: InboundMail;
  domains?: string[];
  pattern?: string | null;
  claim?: ILoginCodeClaims["findActive"] extends (...args: infer _A) => Promise<infer R> ? R : never;
  paid?: boolean;
  aliasSlot?: boolean;
}) {
  const created: Array<Record<string, unknown>> = [];
  const claims: ILoginCodeClaims = {
    findActive: jest.fn().mockResolvedValue(input.claim === undefined ? activeClaim() : input.claim),
    afterMatch: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    subscriptionSlot: {
      findUnique: jest.fn().mockResolvedValue(
        input.aliasSlot
          ? {
              id: "slot-alias",
              userId: "alias-user",
              access: "ACTIVE",
              termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
              termEndsAt: new Date("2026-12-01T00:00:00.000Z"),
            }
          : null
      ),
    },
    subscription: {
      findFirst: jest.fn().mockImplementation(async ({ where }: { where: { OR?: Array<{ email: { equals: string } }> } }) => {
        const emails = (where.OR ?? []).map((item) => item.email.equals.toLowerCase());
        if (!emails.includes("you+netflix1@gmail.com")) {
          return null;
        }
        return {
          id: "sub-1",
          email: "You+Netflix1@gmail.com",
          serviceProvider: {
            codeSenderDomains: input.domains ?? ["netflix.com"],
            codePattern: input.pattern ?? null,
          },
        };
      }),
    },
    loginCode: {
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "code-1" };
      }),
    },
  };
  const seatAccess: ISeatAccess = {
    customerCanUseSeat: jest.fn().mockResolvedValue(input.paid !== false),
  };
  const pushed = publisher();
  let fetches = 0;
  const client: IInboxClient = {
    fetchUnseen: jest.fn(async () => {
      fetches += 1;
      return fetches === 1 ? [input.message] : [];
    }),
  };
  const inbox = new InboxService(
    prisma as unknown as ConstructorParameters<typeof InboxService>[0],
    client,
    pushed,
    seatAccess
  );
  inbox.setClaims(claims);
  return { inbox, pushed, claims, created, prisma };
}

function activeClaim() {
  return {
    id: "claim-1",
    slotId: "slot-1",
    userId: "user-1",
    activatedAt,
    slot: {
      id: "slot-1",
      access: "ACTIVE" as const,
      termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
      termEndsAt: new Date("2026-12-01T00:00:00.000Z"),
    },
  };
}

describe("login code claim matching", () => {
  it.each([
    ["To", ["You+Netflix1@gmail.com"]],
    ["Cc", ["cc@example.com", "you+netflix1@gmail.com"]],
    ["Delivered-To", ["delivered@example.com", "YOU+NETFLIX1@gmail.com"]],
  ])("matches the account email in %s without case", async (_label, recipients) => {
    const { inbox, pushed, claims } = inboxFor({ message: mail({ recipients }) });
    await inbox.poll();
    expect(pushed.codes).toEqual([
      {
        userId: "user-1",
        view: {
          slotId: "slot-1",
          code: "482913",
          receivedAt: receivedAt.toISOString(),
          source: "INBOX",
        },
      },
    ]);
    expect(pushed.adminCodes).toHaveLength(0);
    expect(claims.afterMatch).toHaveBeenCalledWith({
      claimId: "claim-1",
      subscriptionId: "sub-1",
      slotId: "slot-1",
    });
  });

  it("sends a wrong sender to admins", async () => {
    const { inbox, pushed } = inboxFor({
      message: mail({ from: "person@example.com" }),
    });
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toHaveLength(1);
  });

  it("sends a provider with no sender domains to admins", async () => {
    const { inbox, pushed } = inboxFor({ message: mail({}), domains: [] });
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toHaveLength(1);
  });

  it("sends mail from before the turn to admins", async () => {
    const { inbox, pushed } = inboxFor({
      message: mail({ receivedAt: new Date(activatedAt.getTime() - 60_000) }),
    });
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toHaveLength(1);
  });

  it("sends mail with no active claim to admins", async () => {
    const { inbox, pushed, claims } = inboxFor({ message: mail({}), claim: null });
    await inbox.poll();
    expect(claims.afterMatch).not.toHaveBeenCalled();
    expect(pushed.adminCodes).toHaveLength(1);
    expect(pushed.codes).toHaveLength(0);
  });

  it("sends an unpaid seat to admins", async () => {
    const { inbox, pushed } = inboxFor({ message: mail({}), paid: false });
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toHaveLength(1);
  });

  it("matches the seat alias before the account email", async () => {
    const { inbox, pushed, prisma, claims } = inboxFor({
      message: mail({
        recipients: ["seatabc@codes.example", "you+netflix1@gmail.com"],
      }),
      aliasSlot: true,
    });
    await inbox.poll();
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(claims.findActive).not.toHaveBeenCalled();
    expect(pushed.codes[0]?.userId).toBe("alias-user");
    expect(pushed.codes[0]?.view.slotId).toBe("slot-alias");
  });

  it("runs one fetch when two polls overlap", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const client: IInboxClient = {
      fetchUnseen: jest.fn(async () => {
        calls += 1;
        await gate;
        return [];
      }),
    };
    const inbox = new InboxService(
      { loginCode: { findMany: jest.fn(), findFirst: jest.fn() } } as unknown as ConstructorParameters<
        typeof InboxService
      >[0],
      client,
      publisher(),
      { customerCanUseSeat: jest.fn() }
    );
    const first = inbox.poll();
    const second = inbox.poll();
    release();
    await Promise.all([first, second]);
    expect(calls).toBe(1);
  });
});
