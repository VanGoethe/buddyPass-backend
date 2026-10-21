import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  });

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: passwordSchema,
    name: z.string().trim().min(2).max(50).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(50).optional(),
    avatar: z.string().url().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
});

export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: passwordSchema,
    name: z.string().trim().min(2),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["active", "inactive", "all"]).default("all"),
    role: z.enum(["USER", "ADMIN", "all"]).default("all"),
  }),
});

export const userIdSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
});

export const updateStatusSchema = userIdSchema.extend({
  body: z.object({ isActive: z.boolean() }),
});

export const updateRoleSchema = userIdSchema.extend({
  body: z.object({ role: z.enum(["USER", "ADMIN"]) }),
});

export const adminUpdateUserSchema = userIdSchema.extend({
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      avatar: z.string().url().optional(),
    })
    .refine((value) => value.name !== undefined || value.avatar !== undefined, {
      message: "No valid update data provided",
    }),
});

export const createSubscriptionSchema = z.object({
  body: z.object({
    serviceProviderId: z.string().min(1),
    countryId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6),
    maxSlots: z.coerce.number().int().min(1).max(100),
    expiresAt: z.string().datetime().optional(),
    userPrice: z.coerce.number().nonnegative().optional(),
    currencyId: z.string().min(1).optional(),
    currency: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    renewalInfo: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const updateSubscriptionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    maxSlots: z.coerce.number().int().min(1).max(100).optional(),
    countryId: z.string().min(1).optional(),
    expiresAt: z.string().datetime().optional(),
    userPrice: z.coerce.number().nonnegative().optional(),
    currencyId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    renewalInfo: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const slotRequestSchema = z.object({
  body: z.object({
    serviceProviderId: z.string().min(1),
    countryId: z.string().min(1).optional(),
  }),
});

export const slotIdSchema = z.object({
  params: z.object({ slotId: z.string().min(1) }),
});

export const listSubscriptionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z
      .enum(["name", "email", "maxSlots", "expiresAt", "createdAt", "updatedAt"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    search: z.string().optional(),
    serviceProviderId: z.string().optional(),
    countryId: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
  }),
});
