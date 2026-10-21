import { ZodType } from "zod";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from "../../../src/types/schemas";

function issues(schema: ZodType, body: unknown) {
  const result = schema.safeParse({ body });
  if (result.success) {
    return [];
  }
  return result.error.issues;
}

function paths(schema: ZodType, body: unknown): string[] {
  return issues(schema, body).map((issue) => issue.path.join("."));
}

describe("request schemas", () => {
  describe("registerSchema", () => {
    it("accepts a valid registration body", () => {
      expect(
        issues(registerSchema, {
          email: "test@example.com",
          password: "ValidPass123!",
          name: "John Doe",
        })
      ).toHaveLength(0);
    });

    it("accepts a missing optional name", () => {
      expect(
        issues(registerSchema, {
          email: "test@example.com",
          password: "ValidPass123!",
        })
      ).toHaveLength(0);
    });

    it("rejects an invalid email", () => {
      expect(
        paths(registerSchema, {
          email: "invalid-email",
          password: "ValidPass123!",
          name: "John Doe",
        })
      ).toContain("body.email");
    });

    it("rejects a password that misses a required character class", () => {
      const passwords = [
        "validpass123!",
        "VALIDPASS123!",
        "ValidPass!",
        "ValidPass123",
      ];

      for (const password of passwords) {
        const passwordIssues = issues(registerSchema, {
          email: "test@example.com",
          password,
          name: "John Doe",
        }).filter((issue) => issue.path.join(".") === "body.password");

        expect(passwordIssues.length).toBeGreaterThan(0);
        expect(passwordIssues.map((issue) => issue.message)).toContain(
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        );
      }
    });

    it("rejects a name shorter than 2 characters", () => {
      expect(
        paths(registerSchema, {
          email: "test@example.com",
          password: "ValidPass123!",
          name: "A",
        })
      ).toContain("body.name");
    });

    it("rejects a name longer than 50 characters", () => {
      expect(
        paths(registerSchema, {
          email: "test@example.com",
          password: "ValidPass123!",
          name: "A".repeat(51),
        })
      ).toContain("body.name");
    });
  });

  describe("loginSchema", () => {
    it("accepts a valid login body", () => {
      expect(
        issues(loginSchema, {
          email: "test@example.com",
          password: "anypassword",
        })
      ).toHaveLength(0);
    });

    it("rejects an invalid email", () => {
      expect(
        paths(loginSchema, {
          email: "invalid-email",
          password: "anypassword",
        })
      ).toContain("body.email");
    });

    it("rejects an empty password", () => {
      expect(
        paths(loginSchema, {
          email: "test@example.com",
          password: "",
        })
      ).toContain("body.password");
    });
  });

  describe("refreshSchema", () => {
    it("accepts a refresh token", () => {
      expect(
        issues(refreshSchema, { refreshToken: "valid-refresh-token" })
      ).toHaveLength(0);
    });

    it("rejects an empty refresh token", () => {
      expect(paths(refreshSchema, { refreshToken: "" })).toContain(
        "body.refreshToken"
      );
    });
  });

  describe("updateProfileSchema", () => {
    it("accepts name and avatar", () => {
      expect(
        issues(updateProfileSchema, {
          name: "John Doe",
          avatar: "https://example.com/avatar.jpg",
        })
      ).toHaveLength(0);
    });

    it("accepts an empty body", () => {
      expect(issues(updateProfileSchema, {})).toHaveLength(0);
    });

    it("accepts a name of 1 and 50 characters", () => {
      expect(issues(updateProfileSchema, { name: "A" })).toHaveLength(0);
      expect(
        issues(updateProfileSchema, { name: "A".repeat(50) })
      ).toHaveLength(0);
    });

    it("rejects a name longer than 50 characters", () => {
      expect(paths(updateProfileSchema, { name: "A".repeat(51) })).toContain(
        "body.name"
      );
    });

    it("rejects an empty or whitespace-only name", () => {
      expect(paths(updateProfileSchema, { name: "" })).toContain("body.name");
      expect(paths(updateProfileSchema, { name: "   " })).toContain("body.name");
    });

    it("accepts http and https avatar URLs", () => {
      expect(
        issues(updateProfileSchema, {
          avatar: "http://example.com/avatar.jpg",
        })
      ).toHaveLength(0);
      expect(
        issues(updateProfileSchema, {
          avatar:
            "https://cdn.example.com/avatars/user123.jpg?v=2&size=large",
        })
      ).toHaveLength(0);
    });

    it("rejects an avatar that is not a URL", () => {
      for (const avatar of ["not-a-valid-url", "/relative/path/avatar.jpg"]) {
        expect(paths(updateProfileSchema, { avatar })).toContain("body.avatar");
      }
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts a valid password change", () => {
      expect(
        issues(changePasswordSchema, {
          currentPassword: "CurrentPass123!",
          newPassword: "NewValidPass456@",
        })
      ).toHaveLength(0);
    });

    it("rejects an empty current password", () => {
      expect(
        paths(changePasswordSchema, {
          currentPassword: "",
          newPassword: "NewValidPass456@",
        })
      ).toContain("body.currentPassword");
    });

    it("rejects a new password shorter than 8 characters", () => {
      expect(
        paths(changePasswordSchema, {
          currentPassword: "CurrentPass123!",
          newPassword: "Short1!",
        })
      ).toContain("body.newPassword");
    });

    it("rejects a new password that misses a required character class", () => {
      const passwordIssues = issues(changePasswordSchema, {
        currentPassword: "CurrentPass123!",
        newPassword: "validpass123!",
      }).filter((issue) => issue.path.join(".") === "body.newPassword");

      expect(passwordIssues.map((issue) => issue.message)).toContain(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });
  });
});
