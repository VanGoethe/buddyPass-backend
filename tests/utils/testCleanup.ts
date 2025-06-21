import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TestDataCleanup {
  private createdUsers: string[] = [];
  private createdCountries: string[] = [];
  private createdCurrencies: string[] = [];
  private createdServiceProviders: string[] = [];
  private createdSubscriptions: string[] = [];
  private createdSubscriptionSlots: string[] = [];
  private createdSubscriptionRequests: string[] = [];

  // Track created entities
  trackUser(id: string) {
    this.createdUsers.push(id);
  }

  trackCountry(id: string) {
    this.createdCountries.push(id);
  }

  trackCurrency(id: string) {
    this.createdCurrencies.push(id);
  }

  trackServiceProvider(id: string) {
    this.createdServiceProviders.push(id);
  }

  trackSubscription(id: string) {
    this.createdSubscriptions.push(id);
  }

  trackSubscriptionSlot(id: string) {
    this.createdSubscriptionSlots.push(id);
  }

  trackSubscriptionRequest(id: string) {
    this.createdSubscriptionRequests.push(id);
  }

  // Clean up methods
  async cleanupUsers() {
    if (this.createdUsers.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: this.createdUsers } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: this.createdUsers } },
      });
      this.createdUsers = [];
    }
  }

  async cleanupSubscriptions() {
    if (this.createdSubscriptions.length > 0) {
      // Clean up subscription slots and requests first (they depend on subscriptions)
      await this.cleanupSubscriptionSlots();
      await this.cleanupSubscriptionRequests();

      await prisma.subscription.deleteMany({
        where: { id: { in: this.createdSubscriptions } },
      });
      this.createdSubscriptions = [];
    }
  }

  async cleanupSubscriptionSlots() {
    if (this.createdSubscriptionSlots.length > 0) {
      await prisma.subscriptionSlot.deleteMany({
        where: { id: { in: this.createdSubscriptionSlots } },
      });
      this.createdSubscriptionSlots = [];
    }
  }

  async cleanupSubscriptionRequests() {
    if (this.createdSubscriptionRequests.length > 0) {
      await prisma.subscriptionRequest.deleteMany({
        where: { id: { in: this.createdSubscriptionRequests } },
      });
      this.createdSubscriptionRequests = [];
    }
  }

  async cleanupServiceProviders() {
    if (this.createdServiceProviders.length > 0) {
      // Delete service provider countries first
      await prisma.serviceProviderCountry.deleteMany({
        where: { serviceProviderId: { in: this.createdServiceProviders } },
      });
      await prisma.serviceProvider.deleteMany({
        where: { id: { in: this.createdServiceProviders } },
      });
      this.createdServiceProviders = [];
    }
  }

  async cleanupCountries() {
    if (this.createdCountries.length > 0) {
      await prisma.country.deleteMany({
        where: { id: { in: this.createdCountries } },
      });
      this.createdCountries = [];
    }
  }

  async cleanupCurrencies() {
    if (this.createdCurrencies.length > 0) {
      await prisma.currency.deleteMany({
        where: { id: { in: this.createdCurrencies } },
      });
      this.createdCurrencies = [];
    }
  }

  // Clean up everything
  async cleanupAll() {
    await this.cleanupSubscriptions(); // This will also cleanup slots and requests
    await this.cleanupServiceProviders();
    await this.cleanupCountries();
    await this.cleanupCurrencies();
    await this.cleanupUsers();
  }

  // Get or create test entities
  async getOrCreateTestUser(email: string) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: `Test User ${Date.now()}`,
          password: "$2b$10$test.hashed.password",
          role: "USER",
          isVerified: true,
          isActive: true,
        },
      });
      this.trackUser(user.id);
    }
    return user;
  }

  async getOrCreateTestCountry(code: string, name?: string) {
    let country = await prisma.country.findUnique({ where: { code } });
    if (!country) {
      country = await prisma.country.create({
        data: {
          name: name || `Test Country ${code}`,
          code,
          alpha3: code + "X",
          isActive: true,
        },
      });
      this.trackCountry(country.id);
    }
    return country;
  }

  async getOrCreateTestServiceProvider(name: string) {
    let provider = await prisma.serviceProvider.findFirst({ where: { name } });
    if (!provider) {
      provider = await prisma.serviceProvider.create({
        data: {
          name,
          description: `Test service provider: ${name}`,
        },
      });
      this.trackServiceProvider(provider.id);
    }
    return provider;
  }

  async getOrCreateTestCurrency(code: string, name?: string) {
    let currency = await prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      currency = await prisma.currency.create({
        data: {
          name: name || `Test Currency ${code}`,
          code,
          symbol: code === "USD" ? "$" : code === "EUR" ? "€" : "£",
          minorUnit: 2,
          isActive: true,
        },
      });
      this.trackCurrency(currency.id);
    }
    return currency;
  }

  // Close connection
  async disconnect() {
    await prisma.$disconnect();
  }
}

// Export singleton instance for convenience
export const testCleanup = new TestDataCleanup();

// Utility function to be used in tests
export const withTestCleanup = (
  testFn: (cleanup: TestDataCleanup) => Promise<void>
) => {
  return async () => {
    const cleanup = new TestDataCleanup();
    try {
      await testFn(cleanup);
    } finally {
      await cleanup.cleanupAll();
      await cleanup.disconnect();
    }
  };
};
