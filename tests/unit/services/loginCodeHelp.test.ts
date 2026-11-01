import { LoginCodeHelpService } from "../../../src/services/loginCodeHelp";
import { LoginCodeQueue } from "../../../src/services/loginCodes";
import { INotificationPublisher, LoginCodePush } from "../../../src/realtime";
import { INotificationService } from "../../../src/services/notifications";
import { ISeatAccess } from "../../../src/services/payments";

const slot = {
  id: "slot-1",
  userId: "user-1",
  subscriptionId: "sub-1",
  isActive: true,
  releasedAt: null,
  access: "ACTIVE" as const,
  termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
  termEndsAt: new Date("2026-12-01T00:00:00.000Z"),
};

function viewRow(id: string) {
  return {
    id,
    slotId: slot.id,
    userId: slot.userId,
    status: "OPEN" as const,
    createdAt: new Date("2026-11-01T12:00:00.000Z"),
    user: { name: "Ada", email: "ada@example.com" },
    subscription: {
      name: "Netflix Premium",
      email: "you+netflix1@gmail.com",
      serviceProvider: { name: "Netflix" },
    },
    claim: { openedAt: new Date("2026-11-01T11:59:00.000Z") },
  };
}

describe("login code help", () => {
  it("alerts admins once and never puts a code in the notice", async () => {
    const rows = new Map<string, ReturnType<typeof viewRow>>();
    let created = 0;
    const prisma = {
      subscriptionSlot: { findUnique: jest.fn().mockResolvedValue(slot) },
      loginCodeClaim: { findFirst: jest.fn().mockResolvedValue(null) },
      loginCodeHelp: {
        findFirst: jest.fn(async () => (created > 0 ? viewRow("help-1") : null)),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null),
        create: jest.fn(async () => {
          created += 1;
          const row = viewRow("help-1");
          rows.set(row.id, row);
          return row;
        }),
      },
    };
    const notices: string[] = [];
    const notifications = {
      notifyAdminsAboutCodeHelp: jest.fn(async (input: { body: string }) => {
        notices.push(input.body);
      }),
      notifyCodeSentByAdmin: jest.fn(),
    };
    const help = new LoginCodeHelpService(
      prisma as unknown as ConstructorParameters<typeof LoginCodeHelpService>[0],
      {} as LoginCodeQueue,
      {} as INotificationPublisher,
      notifications as unknown as INotificationService,
      { customerCanUseSeat: jest.fn().mockResolvedValue(true) }
    );
    const first = await help.request("user-1", "slot-1");
    const second = await help.request("user-1", "slot-1");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(notifications.notifyAdminsAboutCodeHelp).toHaveBeenCalledTimes(1);
    expect(notices[0]).toContain("you+netflix1@gmail.com");
    expect(notices[0]).not.toContain("999999");
    expect(JSON.stringify(first.help)).not.toMatch(/password/i);
  });

  it("stores an admin code for the holder and refuses an unpaid seat", async () => {
    const created: Array<Record<string, unknown>> = [];
    const pushes: Array<{ userId: string; view: LoginCodePush }> = [];
    const notices: string[] = [];
    const prisma = {
      subscriptionSlot: { findUnique: jest.fn().mockResolvedValue(slot) },
      loginCode: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return data;
        }),
      },
    };
    const queue = { closeSeatClaim: jest.fn().mockResolvedValue(undefined) };
    const publisher = {
      publishLoginCode(userId: string, view: LoginCodePush) {
        pushes.push({ userId, view });
      },
    };
    const notifications = {
      notifyAdminsAboutCodeHelp: jest.fn(),
      notifyCodeSentByAdmin: jest.fn(async () => {
        notices.push("Your verification code is in BuddyPass.");
      }),
    };
    const paid = new LoginCodeHelpService(
      prisma as unknown as ConstructorParameters<typeof LoginCodeHelpService>[0],
      queue as unknown as LoginCodeQueue,
      publisher as unknown as INotificationPublisher,
      notifications as unknown as INotificationService,
      { customerCanUseSeat: jest.fn().mockResolvedValue(true) }
    );
    await paid.enterCode("slot-1", "482913", "admin-1");
    expect(created[0]).toMatchObject({ source: "ADMIN", slotId: "slot-1", code: "482913" });
    expect(pushes).toEqual([
      {
        userId: "user-1",
        view: expect.objectContaining({ source: "ADMIN", slotId: "slot-1", code: "482913" }),
      },
    ]);
    expect(notices[0]).toBe("Your verification code is in BuddyPass.");
    expect(notices[0]).not.toContain("482913");
    expect(queue.closeSeatClaim).toHaveBeenCalledWith("slot-1", "sub-1", "admin-1");

    const unpaid = new LoginCodeHelpService(
      prisma as unknown as ConstructorParameters<typeof LoginCodeHelpService>[0],
      queue as unknown as LoginCodeQueue,
      publisher as unknown as INotificationPublisher,
      notifications as unknown as INotificationService,
      { customerCanUseSeat: jest.fn().mockResolvedValue(false) }
    );
    created.length = 0;
    await expect(unpaid.enterCode("slot-1", "482913", "admin-1")).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
      statusCode: 409,
    });
    expect(created).toHaveLength(0);
  });
});
