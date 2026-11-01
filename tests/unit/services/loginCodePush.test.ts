import { InboxService } from "../../../src/services/inbox";
import { IInboxClient } from "../../../src/services/inbox/imapInboxClient";
import { INotificationPublisher, LoginCodePush } from "../../../src/realtime";
import { ISeatAccess } from "../../../src/services/payments";

jest.mock("../../../src/config/env", () => ({
  env: {
    INBOX_DOMAIN: "codes.example",
    LOGIN_CODE_CLOCK_SKEW_SECONDS: 30,
  },
}));

function publisher(): INotificationPublisher & {
  codes: Array<{ userId: string; view: LoginCodePush }>;
  adminCodes: LoginCodePush[];
} {
  const codes: Array<{ userId: string; view: LoginCodePush }> = [];
  const adminCodes: LoginCodePush[] = [];
  return {
    codes,
    adminCodes,
    publishNotification() {
      return undefined;
    },
    publishLoginCode(userId, view) {
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
    publishToAdmins(_event, payload) {
      adminCodes.push(payload);
    },
    attach() {
      return undefined;
    },
    async close() {
      return undefined;
    },
  };
}

describe("login code push", () => {
  const receivedAt = new Date("2026-10-29T10:00:00.000Z");

  function service(allowed: boolean, alias: string | null) {
    const client: IInboxClient = {
      fetchUnseen: jest.fn().mockResolvedValue([
        {
          recipients: alias ? [`${alias}@codes.example`] : ["nobody@example.com"],
          from: "info@netflix.com",
          receivedAt,
          text: "Your code is 123456",
        },
      ]),
    };
    const prisma = {
      subscriptionSlot: {
        findUnique: jest.fn().mockResolvedValue(
          alias
            ? {
                id: "slot-1",
                userId: "user-1",
                access: "AWAITING_PAYMENT",
                termStartsAt: null,
                termEndsAt: null,
              }
            : null
        ),
      },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      loginCode: { create: jest.fn().mockResolvedValue({ id: "code-1" }) },
    };
    const seatAccess: ISeatAccess = {
      customerCanUseSeat: jest.fn().mockResolvedValue(allowed),
    };
    const pushed = publisher();
    const inbox = new InboxService(
      prisma as unknown as ConstructorParameters<typeof InboxService>[0],
      client,
      pushed,
      seatAccess
    );
    return { inbox, pushed };
  }

  it("sends an unpaid alias code to admins", async () => {
    const { inbox, pushed } = service(false, "seatabc");
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toEqual([
      {
        slotId: null,
        code: "123456",
        receivedAt: receivedAt.toISOString(),
        source: "INBOX",
      },
    ]);
  });

  it("pushes a code to the holder of a paid seat", async () => {
    const { inbox, pushed } = service(true, "seatabc");
    await inbox.poll();
    expect(pushed.codes).toEqual([
      {
        userId: "user-1",
        view: {
          slotId: "slot-1",
          code: "123456",
          receivedAt: receivedAt.toISOString(),
          source: "INBOX",
        },
      },
    ]);
    expect(pushed.adminCodes).toHaveLength(0);
  });

  it("pushes an unmatched code to admins", async () => {
    const { inbox, pushed } = service(false, null);
    await inbox.poll();
    expect(pushed.codes).toHaveLength(0);
    expect(pushed.adminCodes).toEqual([
      {
        slotId: null,
        code: "123456",
        receivedAt: receivedAt.toISOString(),
        source: "INBOX",
      },
    ]);
  });
});
