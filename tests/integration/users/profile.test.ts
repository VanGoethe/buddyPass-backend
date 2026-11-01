import request from "supertest";
import App from "../../../src/app";
import { getPrismaClient } from "../../../src/config/database";
import { signAccessToken } from "../../utils/accessToken";
import { withTestCleanup } from "../../utils/testCleanup";

const app = new App().app;

describe("customer profile", () => {
  it(
    "blocks a seat request until name, phone, and country are set",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const user = await getPrismaClient().user.create({
        data: {
          email: `profile-${stamp}@example.com`,
          name: "P",
          password: "hash",
          isVerified: true,
        },
      });
      cleanup.trackUser(user.id);
      const country = await cleanup.getOrCreateTestCountry(`F${stamp.slice(-6)}`, "Profile Country");
      const provider = await cleanup.getOrCreateTestServiceProvider(`Profile Provider ${stamp}`);
      await getPrismaClient().serviceProviderCountry.create({
        data: { serviceProviderId: provider.id, countryId: country.id },
      });

      const blocked = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe("PROFILE_INCOMPLETE");
      expect(blocked.body.error.details.missing).toEqual(
        expect.arrayContaining(["name", "phone", "countryId"])
      );

      const saved = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
        .send({
          name: "Profile User",
          phone: "+25779111222",
          countryId: country.id,
          timezone: "Africa/Bujumbura",
          age: 24,
          heardAboutUs: "a friend",
          metadata: { source: "test" },
        });
      expect(saved.status).toBe(200);
      expect(saved.body.data.user.profileComplete).toBe(true);
      expect(saved.body.data.user.phone).toBe("+25779111222");
      expect(saved.body.data.user.country.code).toBe(country.code);
      expect(saved.body.data.user.timezone).toBe("Africa/Bujumbura");
      expect(saved.body.data.user.age).toBe(24);
      expect(saved.body.data.user.heardAboutUs).toBe("a friend");
      expect(saved.body.data.user.metadata).toEqual({ source: "test" });

      const cleared = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
        .send({ timezone: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.user.timezone).toBeNull();
      expect(cleared.body.data.user.profileComplete).toBe(true);
    })
  );

  it(
    "rejects a phone that is not in international form",
    withTestCleanup(async (cleanup) => {
      const user = await getPrismaClient().user.create({
        data: {
          email: `phone-${Date.now()}@example.com`,
          name: "Phone User",
          password: "hash",
          isVerified: true,
        },
      });
      cleanup.trackUser(user.id);

      const saved = await request(app)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
        .send({ phone: "079111222" });

      expect(saved.status).toBe(400);
      expect(saved.body.error.code).toBe("VALIDATION_ERROR");
    })
  );
});
