import swaggerJSDoc, { SwaggerDefinition } from "swagger-jsdoc";
import { buildOpenApiSchemas } from "./openapi";

const errorExample = (
  code: string,
  message: string
): { success: false; error: { code: string; message: string } } => ({
  success: false,
  error: { code, message },
});

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "BuddyPass Backend API",
    version: "2.0.0",
    description: `
      BuddyPass Backend API for sharing streaming subscriptions.

      Authentication uses JWT access tokens (15 minutes) and rotating refresh tokens.
      Send \`Authorization: Bearer <access-token>\`.

      Shared account passwords are encrypted and returned only by the credential reveal endpoint.

      Success: \`{ success: true, data, message? }\`
      Error: \`{ success: false, error: { code, message, details? } }\`

      \`GET /health\` (outside the /api prefix) checks the database.
    `,
    contact: {
      name: "BuddyPass API Support",
      email: "support@buddypass.com",
    },
    license: {
      name: "ISC",
    },
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT Authorization header using the Bearer scheme",
      },
    },
    schemas: buildOpenApiSchemas(),
    responses: {
      UnauthorizedError: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: errorExample("UNAUTHORIZED", "Authentication required"),
          },
        },
      },
      ForbiddenError: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: errorExample("FORBIDDEN", "Insufficient permissions"),
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: errorExample("NOT_FOUND", "Resource not found"),
          },
        },
      },
      InternalServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: errorExample(
              "INTERNAL_ERROR",
              "An unexpected error occurred"
            ),
          },
        },
      },
      RateLimitError: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: errorExample(
              "RATE_LIMIT_EXCEEDED",
              "Too many requests, please try again later"
            ),
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: "Authentication", description: "Registration, login, and tokens" },
    { name: "Users", description: "Profile and account operations" },
    { name: "Admin", description: "Administrative operations" },
    { name: "Service Providers", description: "Service provider management" },
    { name: "Subscriptions", description: "Shared subscriptions and slots" },
    { name: "Countries", description: "Country reference data" },
    { name: "Currencies", description: "Currency reference data" },
    { name: "Health", description: "Service health" },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/app.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
