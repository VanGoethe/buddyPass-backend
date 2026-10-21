import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  adminUpdateUserSchema,
  changePasswordSchema,
  createAdminSchema,
  createSubscriptionSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  updateSubscriptionSchema,
} from "../types/schemas";

extendZodWithOpenApi(z);

const jsonValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);

const errorBody = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi("ErrorResponse");

const validationErrorBody = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.literal("VALIDATION_ERROR"),
      message: z.string(),
      details: z
        .array(
          z.object({
            path: z.string(),
            message: z.string(),
          })
        )
        .optional(),
    }),
  })
  .openapi("ValidationErrorResponse");

const successResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.unknown().optional(),
  })
  .openapi("SuccessResponse");

const userResponse = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    avatar: z.string().nullable().optional(),
    provider: z.enum(["local", "google"]).nullable().optional(),
    role: z.enum(["USER", "ADMIN"]),
    isVerified: z.boolean(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastLoginAt: z.string().datetime().nullable().optional(),
  })
  .openapi("UserResponse");

const user = userResponse
  .extend({
    password: z.string().optional(),
    googleId: z.string().nullable().optional(),
  })
  .openapi("User");

const authResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      user: userResponse,
    }),
  })
  .openapi("AuthResponse");

const serviceProvider = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    metadata: jsonValue.nullable().optional(),
    supportedCountries: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          code: z.string(),
          alpha3: z.string(),
        })
      )
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("ServiceProvider");

const createServiceProviderRequest = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    metadata: jsonValue.optional(),
    supportedCountryIds: z.array(z.string()).optional(),
  })
  .openapi("CreateServiceProviderRequest");

const updateServiceProviderRequest = createServiceProviderRequest
  .partial()
  .openapi("UpdateServiceProviderRequest");

const subscription = z
  .object({
    id: z.string(),
    serviceProviderId: z.string(),
    countryId: z.string().nullable().optional(),
    name: z.string(),
    email: z.string().email(),
    maxSlots: z.number().int(),
    availableSlots: z.number().int(),
    occupiedSlots: z.number().int(),
    needsCredentialReset: z.boolean(),
    expiresAt: z.string().datetime().nullable().optional(),
    userPrice: z.number().nullable().optional(),
    currencyId: z.string().nullable().optional(),
    isActive: z.boolean(),
    metadata: jsonValue.nullable().optional(),
    renewalInfo: jsonValue.nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Subscription");

const subscriptionSlot = z
  .object({
    id: z.string(),
    subscriptionId: z.string(),
    userId: z.string(),
    isActive: z.boolean(),
    assignedAt: z.string().datetime(),
    releasedAt: z.string().datetime().nullable().optional(),
  })
  .openapi("SubscriptionSlot");

const subscriptionRequest = z
  .object({
    id: z.string(),
    userId: z.string(),
    serviceProviderId: z.string(),
    countryId: z.string().nullable().optional(),
    status: z.enum(["PENDING", "ASSIGNED", "REJECTED", "CANCELLED"]),
    assignedSlotId: z.string().nullable().optional(),
    requestedAt: z.string().datetime(),
    processedAt: z.string().datetime().nullable().optional(),
  })
  .openapi("SubscriptionRequest");

const country = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    alpha3: z.string(),
    numericCode: z.string().nullable().optional(),
    continent: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    currencyId: z.string().nullable().optional(),
    phoneCode: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Country");

const countryResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: country,
  })
  .openapi("CountryResponse");

const countryListResponse = z
  .object({
    success: z.literal(true),
    data: z.object({
      countries: z.array(country),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  })
  .openapi("CountryListResponse");

const createCountryRequest = z
  .object({
    name: z.string(),
    code: z.string().length(2),
    alpha3: z.string().length(3),
    numericCode: z.string().optional(),
    continent: z.string().optional(),
    region: z.string().optional(),
    currencyId: z.string().optional(),
    phoneCode: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("CreateCountryRequest");

const updateCountryRequest = createCountryRequest
  .partial()
  .openapi("UpdateCountryRequest");

const currency = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    symbol: z.string().nullable().optional(),
    minorUnit: z.number().int(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Currency");

const currencyResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: currency,
  })
  .openapi("CurrencyResponse");

const currencyListResponse = z
  .object({
    success: z.literal(true),
    data: z.object({
      currencies: z.array(currency),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  })
  .openapi("CurrencyListResponse");

const createCurrencyRequest = z
  .object({
    name: z.string(),
    code: z.string().length(3),
    symbol: z.string().optional(),
    minorUnit: z.number().int().min(0).max(4).optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("CreateCurrencyRequest");

const updateCurrencyRequest = createCurrencyRequest
  .partial()
  .openapi("UpdateCurrencyRequest");

const subscriptionResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: subscription,
  })
  .openapi("SubscriptionResponse");

const subscriptionListResponse = z
  .object({
    success: z.literal(true),
    data: z.object({
      subscriptions: z.array(subscription),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
    }),
  })
  .openapi("SubscriptionListResponse");

const serviceProviderResponse = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.object({ serviceProvider }),
  })
  .openapi("ServiceProviderResponse");

const serviceProviderListResponse = z
  .object({
    success: z.literal(true),
    data: z.object({
      serviceProviders: z.array(serviceProvider),
      total: z.number().int(),
    }),
  })
  .openapi("ServiceProviderListResponse");

const adminDashboard = z
  .object({
    users: z.number().int(),
    subscriptions: z.number().int(),
    serviceProviders: z.number().int(),
  })
  .openapi("AdminDashboard");

const credentialReveal = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .openapi("CredentialReveal");

const registry = new OpenAPIRegistry();

function registerBody(
  name: string,
  schema: { shape: { body: z.ZodTypeAny } }
): void {
  registry.register(name, schema.shape.body);
}

registerBody("RegisterRequest", registerSchema);
registerBody("LoginRequest", loginSchema);
registerBody("RefreshRequest", refreshSchema);
registerBody("UpdateProfileRequest", updateProfileSchema);
registerBody("ChangePasswordRequest", changePasswordSchema);
registerBody("CreateAdminRequest", createAdminSchema);
registerBody("CreateSubscriptionRequest", createSubscriptionSchema);
registerBody("UpdateSubscriptionRequest", updateSubscriptionSchema);
registerBody("UpdateUserStatusRequest", updateStatusSchema);
registerBody("UpdateUserRoleRequest", updateRoleSchema);
registerBody("AdminUpdateUserRequest", adminUpdateUserSchema);

registry.register("ErrorResponse", errorBody);
registry.register("ValidationErrorResponse", validationErrorBody);
registry.register("SuccessResponse", successResponse);
registry.register("User", user);
registry.register("UserResponse", userResponse);
registry.register("AuthResponse", authResponse);
registry.register("ServiceProvider", serviceProvider);
registry.register("CreateServiceProviderRequest", createServiceProviderRequest);
registry.register("UpdateServiceProviderRequest", updateServiceProviderRequest);
registry.register("Subscription", subscription);
registry.register("SubscriptionSlot", subscriptionSlot);
registry.register("SubscriptionRequest", subscriptionRequest);
registry.register("SubscriptionResponse", subscriptionResponse);
registry.register("SubscriptionListResponse", subscriptionListResponse);
registry.register("ServiceProviderResponse", serviceProviderResponse);
registry.register("ServiceProviderListResponse", serviceProviderListResponse);
registry.register("Country", country);
registry.register("CountryResponse", countryResponse);
registry.register("CountryListResponse", countryListResponse);
registry.register("CreateCountryRequest", createCountryRequest);
registry.register("UpdateCountryRequest", updateCountryRequest);
registry.register("Currency", currency);
registry.register("CurrencyResponse", currencyResponse);
registry.register("CurrencyListResponse", currencyListResponse);
registry.register("CreateCurrencyRequest", createCurrencyRequest);
registry.register("UpdateCurrencyRequest", updateCurrencyRequest);
registry.register("AdminDashboard", adminDashboard);
registry.register("CredentialReveal", credentialReveal);

export function buildOpenApiSchemas(): Record<string, object> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateComponents();
  return (document.components?.schemas ?? {}) as Record<string, object>;
}
