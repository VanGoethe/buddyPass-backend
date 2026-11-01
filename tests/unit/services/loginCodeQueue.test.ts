import { Prisma } from "@prisma/client";
import { env } from "../../../src/config/env";
import { LoginCodeQueue } from "../../../src/services/loginCodes";
import { IInboxReader } from "../../../src/services/inbox";
import { INotificationPublisher, LoginCodeStatusPush } from "../../../src/realtime";
import { ISeatAccess } from "../../../src/services/payments";

interface Claim {
  id: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  status: "QUEUED" | "ACTIVE" | "MATCHED" | "EXPIRED";
  openedAt: Date;
  activatedAt: Date | null;
  expiresAt: Date | null;
  closedAt: Date | null;
  openAccountKey: string | null;
}

interface Slot {
  id: string;
  userId: string;
  subscriptionId: string;
}

function memory(slots: Slot[], blindActiveReads = 0) {
  const claims: Claim[] = [];
  const codes: Array<{ claimId?: string; code: string; source: string; slotId?: string }> = [];
  let seq = 0;
  let blinded = 0;
  let gate = Promise.resolve();

  function same(claim: Claim, where: Record<string, unknown>): boolean {
    if (typeof where.id === "string" && claim.id !== where.id) return false;
    if (typeof where.slotId === "string" && claim.slotId !== where.slotId) return false;
    if (typeof where.userId === "string" && claim.userId !== where.userId) return false;
    if (typeof where.subscriptionId === "string" && claim.subscriptionId !== where.subscriptionId) {
      return false;
    }
    if (typeof where.status === "string" && claim.status !== where.status) return false;
    const status = where.status as { in?: string[] } | string | undefined;
    if (status && typeof status === "object" && status.in && !status.in.includes(claim.status)) {
      return false;
    }
    const openedAt = where.openedAt as { lt?: Date } | undefined;
    if (openedAt?.lt && claim.openedAt.getTime() >= openedAt.lt.getTime()) return false;
    const expiresAt = where.expiresAt as { lt?: Date } | undefined;
    if (expiresAt?.lt) {
      if (!claim.expiresAt || claim.expiresAt.getTime() >= expiresAt.lt.getTime()) return false;
    }
    return true;
  }

  function apply(claim: Claim, data: Record<string, unknown>): void {
    Object.assign(claim, data);
  }

  function create(data: {
    status: Claim["status"];
    openedAt?: Date;
    activatedAt?: Date;
    expiresAt?: Date;
    openAccountKey?: string | null;
    slot: { connect: { id: string } };
    user: { connect: { id: string } };
    subscription: { connect: { id: string } };
  }): Claim {
    if (
      data.openAccountKey &&
      claims.some((claim) => claim.openAccountKey === data.openAccountKey)
    ) {
      throw new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "5.22.0",
      });
    }
    const claim: Claim = {
      id: `claim-${++seq}`,
      slotId: data.slot.connect.id,
      userId: data.user.connect.id,
      subscriptionId: data.subscription.connect.id,
      status: data.status,
      openedAt: data.openedAt ?? new Date(Date.now() + seq),
      activatedAt: data.activatedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      closedAt: null,
      openAccountKey: data.openAccountKey ?? null,
    };
    claims.push(claim);
    return claim;
  }

  const api: {
    claims: Claim[];
    codes: typeof codes;
    subscriptionSlot: { findUnique: jest.Mock };
    loginCodeClaim: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    loginCode: { findFirst: jest.Mock; create: jest.Mock };
    loginCodeHelp: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  } = {
    claims,
    codes,
    subscriptionSlot: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const slot = slots.find((item) => item.id === where.id);
        if (!slot) return null;
        return {
          ...slot,
          isActive: true,
          releasedAt: null,
          access: "ACTIVE",
          termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
          termEndsAt: new Date("2026-12-01T00:00:00.000Z"),
        };
      }),
    },
    loginCodeClaim: {
      findFirst: jest.fn(async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: { openedAt?: "asc" | "desc" } }) => {
        if (where.status === "ACTIVE" && blinded < blindActiveReads) {
          blinded += 1;
          return null;
        }
        const found = claims.filter((claim) => same(claim, where));
        found.sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
        if (orderBy?.openedAt === "desc") found.reverse();
        return found[0] ?? null;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return claims.find((claim) => claim.id === where.id) ?? null;
      }),
      findMany: jest.fn(async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: { openedAt?: "asc" } }) => {
        const found = claims.filter((claim) => same(claim, where));
        if (orderBy?.openedAt === "asc") {
          found.sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
        }
        return found;
      }),
      count: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return claims.filter((claim) => same(claim, where)).length;
      }),
      create: jest.fn(async ({ data }: { data: Parameters<typeof create>[0] }) => create(data)),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const claim = claims.find((item) => item.id === where.id);
        if (!claim) throw new Error("missing claim");
        apply(claim, data);
        return claim;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (data.openAccountKey && claims.some((claim) => claim.openAccountKey === data.openAccountKey && !same(claim, where))) {
          throw new Prisma.PrismaClientKnownRequestError("Unique", {
            code: "P2002",
            clientVersion: "5.22.0",
          });
        }
        const matched = claims.filter((claim) => same(claim, where));
        matched.forEach((claim) => apply(claim, data));
        return { count: matched.length };
      }),
    },
    loginCode: {
      findFirst: jest.fn(async ({ where }: { where: { claimId: string } }) => {
        return codes.find((code) => code.claimId === where.claimId) ?? null;
      }),
      create: jest.fn(async ({ data }: { data: { claimId?: string; code: string; source: string; slotId?: string } }) => {
        codes.push(data);
        return data;
      }),
    },
    loginCodeHelp: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => {
      const run = gate.then(async () => {
        const ids = new Set(claims.map((claim) => claim.id));
        try {
          return await fn(api);
        } catch (error) {
          for (let index = claims.length - 1; index >= 0; index -= 1) {
            if (!ids.has(claims[index].id)) {
              claims.splice(index, 1);
            }
          }
          throw error;
        }
      });
      gate = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    }),
  };
  return api;
}

function queueFor(slots: Slot[], db: ReturnType<typeof memory>) {
  const statuses: Array<{ userId: string; view: LoginCodeStatusPush }> = [];
  const missed: Array<{ userId: string; slotId: string }> = [];
  const publisher = {
    statuses,
    missed,
    publishNotification() {
      return undefined;
    },
    publishLoginCode() {
      return undefined;
    },
    publishSeatReady() {
      return undefined;
    },
    publishLoginCodeStatus(userId: string, view: LoginCodeStatusPush) {
      statuses.push({ userId, view });
    },
    publishLoginCodeMissed(userId: string, view: { slotId: string }) {
      missed.push({ userId, slotId: view.slotId });
    },
    publishToAdmins() {
      return undefined;
    },
    attach() {
      return undefined;
    },
    async close() {
      return undefined;
    },
  } as INotificationPublisher & { statuses: typeof statuses; missed: typeof missed };
  const poll = jest.fn().mockResolvedValue(0);
  const inbox = { poll, getRecentCode: jest.fn() } as IInboxReader & { poll: jest.Mock };
  const seatAccess: ISeatAccess = { customerCanUseSeat: jest.fn().mockResolvedValue(true) };
  const queue = new LoginCodeQueue(
    db as unknown as ConstructorParameters<typeof LoginCodeQueue>[0],
    inbox,
    publisher,
    seatAccess,
    () => true
  );
  return { queue, publisher, poll, db };
}

describe("login code queue", () => {
  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 0 as unknown as NodeJS.Timeout);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const slots: Slot[] = [
    { id: "slot-1", userId: "user-1", subscriptionId: "sub-1" },
    { id: "slot-2", userId: "user-2", subscriptionId: "sub-1" },
    { id: "slot-3", userId: "user-3", subscriptionId: "sub-1" },
  ];

  it("queues the second member and promotes them when the first matches", async () => {
    const db = memory(slots);
    const { queue, publisher, poll } = queueFor(slots, db);
    const first = await queue.request("user-1", "slot-1");
    const second = await queue.request("user-2", "slot-2");
    const third = await queue.request("user-3", "slot-3");
    expect(first.phase).toBe("active");
    expect(first.position).toBe(0);
    expect(first.estimatedStartAt).toBeNull();
    expect(second.phase).toBe("queued");
    expect(second.position).toBe(1);
    const secondStart = new Date(second.estimatedStartAt ?? 0).getTime();
    expect(secondStart).toBeGreaterThan(Date.now() + 20_000);
    expect(secondStart).toBeLessThan(Date.now() + 70_000);
    expect(third.position).toBe(2);
    expect(poll).toHaveBeenCalledTimes(1);

    const before = db.claims.find((claim) => claim.id === second.claimId)?.activatedAt;
    expect(before).toBeNull();
    await queue.afterMatch({
      claimId: first.claimId,
      subscriptionId: "sub-1",
      slotId: "slot-1",
    });
    const promoted = db.claims.find((claim) => claim.id === second.claimId);
    expect(promoted?.status).toBe("ACTIVE");
    expect(promoted?.activatedAt).not.toBeNull();
    const waiting = await queue.request("user-3", "slot-3");
    expect(waiting.phase).toBe("queued");
    expect(waiting.position).toBe(1);
    expect(publisher.statuses.some((event) => event.userId === "user-2" && event.view.phase === "active" && event.view.estimatedStartAt === null)).toBe(true);
  });

  it("makes one active claim when two requests race", async () => {
    const db = memory(slots, 2);
    const { queue } = queueFor(slots, db);
    const [first, second] = await Promise.all([
      queue.request("user-1", "slot-1"),
      queue.request("user-2", "slot-2"),
    ]);
    const phases = [first.phase, second.phase].sort();
    expect(phases).toEqual(["active", "queued"]);
    expect(db.claims.filter((claim) => claim.status === "ACTIVE")).toHaveLength(1);
    expect(db.claims.filter((claim) => claim.status === "QUEUED")).toHaveLength(1);
  });

  it("keeps a slow turn's countdown at now", async () => {
    const db = memory(slots);
    const { queue } = queueFor(slots, db);
    await queue.request("user-1", "slot-1");
    const active = db.claims.find((claim) => claim.status === "ACTIVE");
    if (!active) throw new Error("missing active claim");
    active.activatedAt = new Date(Date.now() - (env.LOGIN_CODE_TURN_ESTIMATE_SECONDS + 5) * 1000);
    const waiting = await queue.request("user-2", "slot-2");
    const start = new Date(waiting.estimatedStartAt ?? 0).getTime();
    expect(Math.abs(start - Date.now())).toBeLessThan(2_000);
  });

  it("extends an active recheck and leaves a queued place", async () => {
    const db = memory(slots);
    const { queue, poll } = queueFor(slots, db);
    const first = await queue.request("user-1", "slot-1");
    const activeClaim = db.claims.find((claim) => claim.id === first.claimId);
    if (!activeClaim?.expiresAt) throw new Error("missing expiry");
    activeClaim.expiresAt = new Date(activeClaim.expiresAt.getTime() - 10_000);
    const before = activeClaim.expiresAt.getTime();
    poll.mockClear();
    const again = await queue.request("user-1", "slot-1");
    const after = db.claims.find((claim) => claim.id === first.claimId)?.expiresAt?.getTime();
    expect(again.phase).toBe("active");
    expect(after).toBeGreaterThan(before ?? 0);
    expect(poll).toHaveBeenCalledTimes(1);
    await queue.request("user-2", "slot-2");
    poll.mockClear();
    const queuedAgain = await queue.request("user-2", "slot-2");
    expect(queuedAgain.phase).toBe("queued");
    expect(queuedAgain.position).toBe(1);
    expect(poll).not.toHaveBeenCalled();
  });

  it("expires the active claim and promotes the next one", async () => {
    jest.restoreAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
    const db = memory(slots);
    const { queue, publisher } = queueFor(slots, db);
    await queue.request("user-1", "slot-1");
    await queue.request("user-2", "slot-2");
    const waiting = db.claims.find((claim) => claim.userId === "user-2");
    if (waiting) {
      waiting.openedAt = new Date(waiting.openedAt.getTime() + 1000);
    }
    const active = db.claims.find((claim) => claim.status === "ACTIVE");
    if (!active?.expiresAt) throw new Error("missing expiry");
    active.expiresAt = new Date("2026-11-01T11:00:00.000Z");
    queue.stopWatch();
    queue.startWatch();
    await jest.advanceTimersByTimeAsync(env.LOGIN_CODE_WATCH_INTERVAL_SECONDS * 1000);
    expect(publisher.missed).toEqual([{ userId: "user-1", slotId: "slot-1" }]);
    expect(db.claims.find((claim) => claim.userId === "user-1")?.status).toBe("EXPIRED");
    expect(db.claims.find((claim) => claim.userId === "user-2")?.status).toBe("ACTIVE");
    jest.useRealTimers();
  });

  it("refuses a code request before payment and when the inbox is off", async () => {
    const db = memory(slots);
    const seatAccess: ISeatAccess = { customerCanUseSeat: jest.fn().mockResolvedValue(false) };
    const unpaid = new LoginCodeQueue(
      db as unknown as ConstructorParameters<typeof LoginCodeQueue>[0],
      { poll: jest.fn(), getRecentCode: jest.fn() },
      { publishLoginCodeStatus() {}, publishLoginCodeMissed() {} } as unknown as INotificationPublisher,
      seatAccess,
      () => true
    );
    await expect(unpaid.request("user-1", "slot-1")).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
      statusCode: 403,
    });
    const unavailable = new LoginCodeQueue(
      db as unknown as ConstructorParameters<typeof LoginCodeQueue>[0],
      { poll: jest.fn(), getRecentCode: jest.fn() },
      { publishLoginCodeStatus() {}, publishLoginCodeMissed() {} } as unknown as INotificationPublisher,
      { customerCanUseSeat: jest.fn().mockResolvedValue(true) },
      () => false
    );
    await expect(unavailable.request("user-1", "slot-1")).rejects.toMatchObject({
      code: "INBOX_UNAVAILABLE",
      statusCode: 503,
    });
    expect(db.claims).toHaveLength(0);
  });
});
