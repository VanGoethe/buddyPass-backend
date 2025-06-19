import { Request } from "express";
import { validationResult } from "express-validator";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
} from "../../../src/utils/validation";

// Mock Express Request
const createMockRequest = (body: any, query: any = {}): Partial<Request> => ({
  body,
  query,
});

// Helper to run validation and get errors
const runValidation = async (
  validations: any[],
  req: Partial<Request>
): Promise<any[]> => {
  for (const validation of validations) {
    await validation.run(req);
  }
  const errors = validationResult(req as Request);
  return errors.array();
};

describe("Validation Utils", () => {
  describe("registerValidation", () => {
    it("should pass with valid registration data", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "ValidPass123!",
        name: "John Doe",
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with invalid email", async () => {
      const req = createMockRequest({
        email: "invalid-email",
        password: "ValidPass123!",
        name: "John Doe",
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "email",
            msg: "Please provide a valid email address",
          }),
        ])
      );
    });

    it("should fail with weak password", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "weak",
        name: "John Doe",
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "password",
          }),
        ])
      );
    });

    it("should fail with name too short", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "ValidPass123!",
        name: "A",
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "name",
            msg: "Name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should fail with name too long", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "ValidPass123!",
        name: "A".repeat(51),
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "name",
            msg: "Name must be between 2 and 50 characters",
          }),
        ])
      );
    });

    it("should pass with optional name omitted", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "ValidPass123!",
      });

      const errors = await runValidation(registerValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should require uppercase, lowercase, number, and special character in password", async () => {
      const testCases = [
        { password: "validpass123!", desc: "missing uppercase" },
        { password: "VALIDPASS123!", desc: "missing lowercase" },
        { password: "ValidPass!", desc: "missing number" },
        { password: "ValidPass123", desc: "missing special character" },
      ];

      for (const testCase of testCases) {
        const req = createMockRequest({
          email: "test@example.com",
          password: testCase.password,
          name: "John Doe",
        });

        const errors = await runValidation(registerValidation, req);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: "password",
              msg: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            }),
          ])
        );
      }
    });
  });

  describe("loginValidation", () => {
    it("should pass with valid login data", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "anypassword",
      });

      const errors = await runValidation(loginValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with invalid email", async () => {
      const req = createMockRequest({
        email: "invalid-email",
        password: "anypassword",
      });

      const errors = await runValidation(loginValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "email",
            msg: "Please provide a valid email address",
          }),
        ])
      );
    });

    it("should fail with empty password", async () => {
      const req = createMockRequest({
        email: "test@example.com",
        password: "",
      });

      const errors = await runValidation(loginValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "password",
            msg: "Password is required",
          }),
        ])
      );
    });
  });

  describe("refreshTokenValidation", () => {
    it("should pass with valid refresh token", async () => {
      const req = createMockRequest({
        refreshToken: "valid-refresh-token",
      });

      const errors = await runValidation(refreshTokenValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with empty refresh token", async () => {
      const req = createMockRequest({
        refreshToken: "",
      });

      const errors = await runValidation(refreshTokenValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "refreshToken",
            msg: "Refresh token is required",
          }),
        ])
      );
    });
  });

  describe("updateProfileValidation", () => {
    it("should pass with valid profile data", async () => {
      const req = createMockRequest({
        name: "John Doe",
        avatar: "https://example.com/avatar.jpg",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should pass with only name provided", async () => {
      const req = createMockRequest({
        name: "John Doe",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should pass with only avatar provided", async () => {
      const req = createMockRequest({
        avatar: "https://example.com/avatar.jpg",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should pass with no fields provided (all optional)", async () => {
      const req = createMockRequest({});

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    // Boundary testing for name length
    it("should pass with name at minimum length (1 character)", async () => {
      const req = createMockRequest({
        name: "A",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should pass with name at maximum length (50 characters)", async () => {
      const req = createMockRequest({
        name: "A".repeat(50),
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with name too long (51 characters)", async () => {
      const req = createMockRequest({
        name: "A".repeat(51),
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "name",
            msg: "Name must be between 1 and 50 characters when provided",
          }),
        ])
      );
    });

    it("should fail with empty name when provided", async () => {
      const req = createMockRequest({
        name: "",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "name",
            msg: "Name must be between 1 and 50 characters when provided",
          }),
        ])
      );
    });

    it("should fail with whitespace-only name", async () => {
      const req = createMockRequest({
        name: "   ",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "name",
            msg: "Name must be between 1 and 50 characters when provided",
          }),
        ])
      );
    });

    // Avatar URL validation edge cases
    it("should pass with valid HTTP URL", async () => {
      const req = createMockRequest({
        avatar: "http://example.com/avatar.jpg",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should pass with valid HTTPS URL", async () => {
      const req = createMockRequest({
        avatar: "https://secure.example.com/avatar.png",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with invalid URL", async () => {
      const req = createMockRequest({
        avatar: "not-a-valid-url",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "avatar",
            msg: "Avatar must be a valid URL",
          }),
        ])
      );
    });

    it("should fail with malformed URL", async () => {
      const req = createMockRequest({
        avatar: "htp://malformed-url",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "avatar",
            msg: "Avatar must be a valid URL",
          }),
        ])
      );
    });

    it("should fail with relative URL", async () => {
      const req = createMockRequest({
        avatar: "/relative/path/avatar.jpg",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "avatar",
            msg: "Avatar must be a valid URL",
          }),
        ])
      );
    });

    it("should pass with complex valid URL with query parameters", async () => {
      const req = createMockRequest({
        avatar: "https://cdn.example.com/avatars/user123.jpg?v=2&size=large",
      });

      const errors = await runValidation(updateProfileValidation, req);
      expect(errors).toHaveLength(0);
    });
  });

  describe("changePasswordValidation", () => {
    it("should pass with valid password change data", async () => {
      const req = createMockRequest({
        currentPassword: "CurrentPass123!",
        newPassword: "NewValidPass456@",
      });

      const errors = await runValidation(changePasswordValidation, req);
      expect(errors).toHaveLength(0);
    });

    it("should fail with empty current password", async () => {
      const req = createMockRequest({
        currentPassword: "",
        newPassword: "NewValidPass456@",
      });

      const errors = await runValidation(changePasswordValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "currentPassword",
            msg: "Current password is required",
          }),
        ])
      );
    });

    it("should fail with weak new password", async () => {
      const req = createMockRequest({
        currentPassword: "CurrentPass123!",
        newPassword: "weak",
      });

      const errors = await runValidation(changePasswordValidation, req);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "newPassword",
          }),
        ])
      );
    });

    it("should require all character types in new password", async () => {
      const testCases = [
        { password: "validpass123!", desc: "missing uppercase" },
        { password: "VALIDPASS123!", desc: "missing lowercase" },
        { password: "ValidPass!", desc: "missing number" },
        { password: "ValidPass123", desc: "missing special character" },
      ];

      for (const testCase of testCases) {
        const req = createMockRequest({
          currentPassword: "CurrentPass123!",
          newPassword: testCase.password,
        });

        const errors = await runValidation(changePasswordValidation, req);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: "newPassword",
              msg: "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            }),
          ])
        );
      }
    });

    it("should require minimum length for new password", async () => {
      const req = createMockRequest({
        currentPassword: "CurrentPass123!",
        newPassword: "Short1!",
      });

      const errors = await runValidation(changePasswordValidation, req);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "newPassword",
            msg: "New password must be at least 8 characters long",
          }),
        ])
      );
    });
  });
});
