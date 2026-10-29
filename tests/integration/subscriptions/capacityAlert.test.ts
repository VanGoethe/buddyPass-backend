import request from "supertest";
import { UserRole } from "@prisma/client";
import App from "../../../src/app";
import { getPrismaClient, disconnectDatabase } from "../../../src/config/database";
import { container } from "../../../src/container";
import { withTestCleanup } from "../../utils/testCleanup";
import {
  FUTURE_EXPIRES_AT,
  occupiedSlotData,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

const app = new App().app;

describe("capacity alerts", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it(
    "opens an alert when the only account takes its first seat",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const stamp = Date.now();
      const user = await cleanup.getOrCreateTestUser(
        `capacity-holder-${stamp}@example.com`
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Capacity Provider ${stamp}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Only account",
          email: `only-${stamp}@streams.test`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const assigned = await container
        .getSubscriptionService()
        .requestSubscriptionSlot(user.id, { serviceProviderId: provider.id });
      cleanup.trackSubscriptionRequest(assigned.id);
      if (assigned.assignedSlotId) {
        cleanup.trackSubscriptionSlot(assigned.assignedSlotId);
      }

      const open = await prisma.capacityAlert.findMany({
        where: { serviceProviderId: provider.id, status: "OPEN" },
      });
      expect(open).toHaveLength(1);
      expect(open[0].headroom).toBe(4);
      expect(open[0].packingSubscriptionId).toBe(subscription.id);
      expect(open[0].openPoolKey).toBe(`${provider.id}:none`);
    })
  );

  it(
    "stays closed while an empty spare account exists",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const stamp = Date.now();
      const user = await cleanup.getOrCreateTestUser(
        `capacity-spare-user-${stamp}@example.com`
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Capacity Spare ${stamp}`
      );
      const first = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Filling",
          email: `filling-${stamp}@streams.test`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      const spare = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Spare",
          email: `spare-${stamp}@streams.test`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(first.id);
      cleanup.trackSubscription(spare.id);

      const assigned = await container
        .getSubscriptionService()
        .requestSubscriptionSlot(user.id, { serviceProviderId: provider.id });
      cleanup.trackSubscriptionRequest(assigned.id);
      if (assigned.assignedSlotId) {
        cleanup.trackSubscriptionSlot(assigned.assignedSlotId);
      }

      const open = await prisma.capacityAlert.count({
        where: { serviceProviderId: provider.id, status: "OPEN" },
      });
      expect(open).toBe(0);
    })
  );

  it(
    "resolves the alert after a new subscription is created",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const stamp = Date.now();
      const user = await cleanup.getOrCreateTestUser(
        `capacity-resolve-user-${stamp}@example.com`
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Capacity Resolve ${stamp}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Filling",
          email: `resolve-${stamp}@streams.test`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const assigned = await container
        .getSubscriptionService()
        .requestSubscriptionSlot(user.id, { serviceProviderId: provider.id });
      cleanup.trackSubscriptionRequest(assigned.id);
      if (assigned.assignedSlotId) {
        cleanup.trackSubscriptionSlot(assigned.assignedSlotId);
      }

      const created = await container.getSubscriptionService().createSubscription({
        serviceProviderId: provider.id,
        name: "Restock",
        email: `restock-${stamp}@streams.test`,
        password: "SharedPass1",
        maxSlots: 5,
        expiresAt: FUTURE_EXPIRES_AT,
      });
      cleanup.trackSubscription(created.id);

      const open = await prisma.capacityAlert.count({
        where: { serviceProviderId: provider.id, status: "OPEN" },
      });
      const resolved = await prisma.capacityAlert.findFirst({
        where: { serviceProviderId: provider.id, status: "RESOLVED" },
      });
      expect(open).toBe(0);
      expect(resolved).not.toBeNull();
      expect(resolved?.openPoolKey).toBeNull();
    })
  );

  it(
    "lists the open alert for an admin",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const stamp = Date.now();
      const admin = await cleanup.getOrCreateTestUser(
        `capacity-admin-${stamp}@example.com`
      );
      const member = await cleanup.getOrCreateTestUser(
        `capacity-member-${stamp}@example.com`
      );
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: UserRole.ADMIN },
      });
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Capacity Admin ${stamp}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Listed",
          email: `listed-${stamp}@streams.test`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);
      const slot = await prisma.subscriptionSlot.create({
        data: occupiedSlotData(member.id, subscription.id),
      });
      cleanup.trackSubscriptionSlot(slot.id);
      await container
        .getCapacityForecastService()
        .recompute(provider.id, null);

      const tokenFor = (userId: string, email: string, role: UserRole): string =>
        container.getUserService().generateAccessToken({ userId, email, role });

      const adminToken = tokenFor(admin.id, admin.email, UserRole.ADMIN);
      const userToken = tokenFor(member.id, member.email, UserRole.USER);

      const listed = await request(app)
        .get("/api/admin/capacity-alerts")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const match = listed.body.data.alerts.find(
        (alert: { serviceProviderId: string }) =>
          alert.serviceProviderId === provider.id
      );
      expect(match).toEqual(
        expect.objectContaining({
          serviceProviderName: provider.name,
          countryId: null,
          headroom: 4,
          packingSubscriptionId: subscription.id,
        })
      );

      const dashboard = await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(dashboard.body.data.openCapacityAlerts.count).toBeGreaterThanOrEqual(1);
      expect(dashboard.body.data.statistics.totalUsers).toEqual(expect.any(Number));

      await request(app)
        .get("/api/admin/capacity-alerts")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    })
  );
});
