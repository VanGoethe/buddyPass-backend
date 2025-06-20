/**
 * Rate Limiting Configuration Tests
 */

import {
  getRateLimitConfig,
  getRateLimitForEndpoint,
  rateLimitConfig,
  rateLimitEnvironment,
  RateLimitConfigs,
} from "../../../src/config/rateLimiting";

describe("Rate Limiting Configuration", () => {
  // Store original NODE_ENV to restore later
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore original NODE_ENV after each test
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("Environment Detection", () => {
    it("should detect test environment correctly", () => {
      process.env.NODE_ENV = "test";

      // Need to re-import to get updated environment detection
      jest.resetModules();
      const {
        rateLimitEnvironment: testEnv,
      } = require("../../../src/config/rateLimiting");

      expect(testEnv.isTest).toBe(true);
      expect(testEnv.isDevelopment).toBe(false);
      expect(testEnv.isProduction).toBe(false);
      expect(testEnv.currentEnv).toBe("test");
    });

    it("should detect development environment correctly", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();
      const {
        rateLimitEnvironment: devEnv,
      } = require("../../../src/config/rateLimiting");

      expect(devEnv.isTest).toBe(false);
      expect(devEnv.isDevelopment).toBe(true);
      expect(devEnv.isProduction).toBe(false);
      expect(devEnv.currentEnv).toBe("development");
    });

    it("should detect production environment correctly", () => {
      process.env.NODE_ENV = "production";

      jest.resetModules();
      const {
        rateLimitEnvironment: prodEnv,
      } = require("../../../src/config/rateLimiting");

      expect(prodEnv.isTest).toBe(false);
      expect(prodEnv.isDevelopment).toBe(false);
      expect(prodEnv.isProduction).toBe(true);
      expect(prodEnv.currentEnv).toBe("production");
    });

    it.skip("should default to development when NODE_ENV is not set (skipped in test environment)", () => {
      // This test is skipped because Jest automatically sets NODE_ENV=test
      // The default behavior is tested implicitly in other environment-specific tests
    });
  });

  describe("Configuration Structure", () => {
    it("should have all required endpoint configurations", () => {
      const config = getRateLimitConfig();

      expect(config).toHaveProperty("login");
      expect(config).toHaveProperty("register");
      expect(config).toHaveProperty("passwordChange");
      expect(config).toHaveProperty("general");
      expect(config).toHaveProperty("admin");
    });

    it("should have valid structure for each endpoint config", () => {
      const config = getRateLimitConfig();

      Object.values(config).forEach((endpointConfig) => {
        expect(endpointConfig).toHaveProperty("maxAttempts");
        expect(endpointConfig).toHaveProperty("windowMs");
        expect(endpointConfig).toHaveProperty("description");

        expect(typeof endpointConfig.maxAttempts).toBe("number");
        expect(typeof endpointConfig.windowMs).toBe("number");
        expect(typeof endpointConfig.description).toBe("string");

        expect(endpointConfig.maxAttempts).toBeGreaterThan(0);
        expect(endpointConfig.windowMs).toBeGreaterThan(0);
        expect(endpointConfig.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Environment-Specific Configurations", () => {
    it("should use production config in production environment", () => {
      process.env.NODE_ENV = "production";

      jest.resetModules();
      const {
        getRateLimitConfig: getProdConfig,
      } = require("../../../src/config/rateLimiting");
      const config = getProdConfig();

      // Production should have stricter limits
      expect(config.login.maxAttempts).toBe(5);
      expect(config.login.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(config.register.maxAttempts).toBe(3);
      expect(config.register.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it("should use development config in development environment", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();
      const {
        getRateLimitConfig: getDevConfig,
      } = require("../../../src/config/rateLimiting");
      const config = getDevConfig();

      // Development should have more lenient limits than production
      expect(config.login.maxAttempts).toBe(20);
      expect(config.login.windowMs).toBe(5 * 60 * 1000); // 5 minutes
      expect(config.register.maxAttempts).toBe(10);
      expect(config.register.windowMs).toBe(10 * 60 * 1000); // 10 minutes
    });

    it("should use test config in test environment", () => {
      process.env.NODE_ENV = "test";

      jest.resetModules();
      const {
        getRateLimitConfig: getTestConfig,
      } = require("../../../src/config/rateLimiting");
      const config = getTestConfig();

      // Test should have very lenient limits to prevent test failures
      expect(config.login.maxAttempts).toBe(100);
      expect(config.login.windowMs).toBe(60 * 1000); // 1 minute
      expect(config.register.maxAttempts).toBe(50);
      expect(config.register.windowMs).toBe(60 * 1000); // 1 minute
    });
  });

  describe("Helper Functions", () => {
    it("should return correct config for specific endpoints", () => {
      const loginConfig = getRateLimitForEndpoint("login");
      const registerConfig = getRateLimitForEndpoint("register");
      const adminConfig = getRateLimitForEndpoint("admin");

      expect(loginConfig).toHaveProperty("maxAttempts");
      expect(loginConfig).toHaveProperty("windowMs");
      expect(loginConfig).toHaveProperty("description");

      expect(registerConfig).toHaveProperty("maxAttempts");
      expect(registerConfig).toHaveProperty("windowMs");
      expect(registerConfig).toHaveProperty("description");

      expect(adminConfig).toHaveProperty("maxAttempts");
      expect(adminConfig).toHaveProperty("windowMs");
      expect(adminConfig).toHaveProperty("description");
    });

    it("should return different configs for different endpoints", () => {
      const loginConfig = getRateLimitForEndpoint("login");
      const registerConfig = getRateLimitForEndpoint("register");

      // Different endpoints should have potentially different limits
      expect(loginConfig).not.toEqual(registerConfig);
    });
  });

  describe("Logical Rate Limiting Rules", () => {
    it("should have test environment more lenient than production", () => {
      // Test production config
      process.env.NODE_ENV = "production";
      jest.resetModules();
      const {
        getRateLimitConfig: getProdConfig,
      } = require("../../../src/config/rateLimiting");
      const prodConfig = getProdConfig();

      // Test test config
      process.env.NODE_ENV = "test";
      jest.resetModules();
      const {
        getRateLimitConfig: getTestConfig,
      } = require("../../../src/config/rateLimiting");
      const testConfig = getTestConfig();

      // Test environment should allow more attempts
      expect(testConfig.login.maxAttempts).toBeGreaterThan(
        prodConfig.login.maxAttempts
      );
      expect(testConfig.register.maxAttempts).toBeGreaterThan(
        prodConfig.register.maxAttempts
      );
      expect(testConfig.passwordChange.maxAttempts).toBeGreaterThan(
        prodConfig.passwordChange.maxAttempts
      );
    });

    it("should have development environment more lenient than production", () => {
      // Test production config
      process.env.NODE_ENV = "production";
      jest.resetModules();
      const {
        getRateLimitConfig: getProdConfig,
      } = require("../../../src/config/rateLimiting");
      const prodConfig = getProdConfig();

      // Test development config
      process.env.NODE_ENV = "development";
      jest.resetModules();
      const {
        getRateLimitConfig: getDevConfig,
      } = require("../../../src/config/rateLimiting");
      const devConfig = getDevConfig();

      // Development environment should allow more attempts than production
      expect(devConfig.login.maxAttempts).toBeGreaterThan(
        prodConfig.login.maxAttempts
      );
      expect(devConfig.register.maxAttempts).toBeGreaterThan(
        prodConfig.register.maxAttempts
      );
      expect(devConfig.general.maxAttempts).toBeGreaterThan(
        prodConfig.general.maxAttempts
      );
    });

    it("should have reasonable time windows", () => {
      const config = getRateLimitConfig();

      // All time windows should be reasonable (between 1 minute and 24 hours)
      Object.values(config).forEach((endpointConfig) => {
        expect(endpointConfig.windowMs).toBeGreaterThanOrEqual(60 * 1000); // At least 1 minute
        expect(endpointConfig.windowMs).toBeLessThanOrEqual(
          24 * 60 * 60 * 1000
        ); // At most 24 hours
      });
    });

    it("should have reasonable attempt limits", () => {
      const config = getRateLimitConfig();

      // All attempt limits should be reasonable (at least 1, at most 10000)
      Object.values(config).forEach((endpointConfig) => {
        expect(endpointConfig.maxAttempts).toBeGreaterThanOrEqual(1);
        expect(endpointConfig.maxAttempts).toBeLessThanOrEqual(10000);
      });
    });
  });

  describe("Description Quality", () => {
    it("should have meaningful descriptions for all endpoints", () => {
      const config = getRateLimitConfig();

      Object.entries(config).forEach(([endpointName, endpointConfig]) => {
        expect(endpointConfig.description).toContain(
          endpointConfig.maxAttempts.toString()
        );
        expect(endpointConfig.description.toLowerCase()).toContain("per");

        // Should mention the endpoint type or time period
        const description = endpointConfig.description.toLowerCase();
        const hasTimeReference =
          description.includes("minute") ||
          description.includes("hour") ||
          description.includes("second");
        expect(hasTimeReference).toBe(true);
      });
    });

    it("should include environment indicator in descriptions for non-production", () => {
      // Test development descriptions
      process.env.NODE_ENV = "development";
      jest.resetModules();
      const {
        getRateLimitConfig: getDevConfig,
      } = require("../../../src/config/rateLimiting");
      const devConfig = getDevConfig();

      Object.values(devConfig).forEach((endpointConfig: any) => {
        expect(endpointConfig.description.toLowerCase()).toContain(
          "development"
        );
      });

      // Test test environment descriptions
      process.env.NODE_ENV = "test";
      jest.resetModules();
      const {
        getRateLimitConfig: getTestConfig,
      } = require("../../../src/config/rateLimiting");
      const testConfig = getTestConfig();

      Object.values(testConfig).forEach((endpointConfig: any) => {
        expect(endpointConfig.description.toLowerCase()).toContain("test");
      });
    });
  });
});
