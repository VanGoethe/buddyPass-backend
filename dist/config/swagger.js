"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "BuddyPass Backend API",
        version: "1.3.0",
        description: `
      BuddyPass Backend API - Subscription Sharing Platform
      
      A comprehensive backend system for managing subscription sharing between users.
      Features include user authentication, role-based access control, subscription management,
      and admin dashboard functionality.
      
      ## Authentication
      This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
      \`Authorization: Bearer <your-jwt-token>\`
      
      ## Rate Limiting
      API endpoints have rate limiting applied:
      - Login: 5 attempts per 15 minutes
      - Registration: 3 attempts per hour
      - Password Change: 3 attempts per hour
      
      ## Response Format
      All API responses follow a consistent format:
      - Success: \`{ success: true, data: {...}, message?: string }\`
      - Error: \`{ success: false, error: { code: string, message: string, details?: any } }\`
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
        {
            url: "https://api.buddypass.com/api",
            description: "Production server",
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
            GoogleOAuth: {
                type: "oauth2",
                flows: {
                    authorizationCode: {
                        authorizationUrl: "/api/users/auth/google",
                        tokenUrl: "/api/users/auth/google/callback",
                        scopes: {
                            profile: "Access to user profile information",
                            email: "Access to user email address",
                        },
                    },
                },
            },
        },
        schemas: {
            // User Schemas
            User: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "cuid",
                        description: "Unique user identifier",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "User email address",
                    },
                    name: {
                        type: "string",
                        description: "User display name",
                        nullable: true,
                    },
                    avatar: {
                        type: "string",
                        format: "uri",
                        description: "User avatar URL",
                        nullable: true,
                    },
                    role: {
                        type: "string",
                        enum: ["USER", "ADMIN"],
                        description: "User role for access control",
                    },
                    isVerified: {
                        type: "boolean",
                        description: "Whether user email is verified",
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether user account is active",
                    },
                    provider: {
                        type: "string",
                        enum: ["local", "google"],
                        description: "Authentication provider",
                        nullable: true,
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Account creation timestamp",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                    },
                    lastLoginAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last login timestamp",
                        nullable: true,
                    },
                },
                required: [
                    "id",
                    "email",
                    "role",
                    "isVerified",
                    "isActive",
                    "createdAt",
                    "updatedAt",
                ],
            },
            UserResponse: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "cuid",
                    },
                    email: {
                        type: "string",
                        format: "email",
                    },
                    name: {
                        type: "string",
                        nullable: true,
                    },
                    avatar: {
                        type: "string",
                        format: "uri",
                        nullable: true,
                    },
                    role: {
                        type: "string",
                        enum: ["USER", "ADMIN"],
                    },
                    isVerified: {
                        type: "boolean",
                    },
                    provider: {
                        type: "string",
                        enum: ["local", "google"],
                        nullable: true,
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    lastLoginAt: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                },
                required: ["id", "email", "role", "isVerified", "createdAt"],
            },
            RegisterRequest: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        description: "User email address",
                    },
                    password: {
                        type: "string",
                        minLength: 8,
                        description: "Password (min 8 characters, must include uppercase, lowercase, number, and special character)",
                    },
                    name: {
                        type: "string",
                        minLength: 2,
                        description: "User display name",
                    },
                },
                required: ["email", "password", "name"],
            },
            LoginRequest: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        description: "User email address",
                    },
                    password: {
                        type: "string",
                        description: "User password",
                    },
                },
                required: ["email", "password"],
            },
            ChangePasswordRequest: {
                type: "object",
                properties: {
                    currentPassword: {
                        type: "string",
                        description: "Current password",
                    },
                    newPassword: {
                        type: "string",
                        minLength: 8,
                        description: "New password (min 8 characters, must include uppercase, lowercase, number, and special character)",
                    },
                },
                required: ["currentPassword", "newPassword"],
            },
            UpdateProfileRequest: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        description: "User display name",
                    },
                    avatar: {
                        type: "string",
                        format: "uri",
                        description: "User avatar URL",
                    },
                },
            },
            // ServiceProvider Schemas
            ServiceProvider: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "cuid",
                        description: "Unique service provider identifier",
                    },
                    name: {
                        type: "string",
                        description: "Service provider name",
                    },
                    description: {
                        type: "string",
                        description: "Service provider description",
                        nullable: true,
                    },
                    metadata: {
                        type: "object",
                        description: "Additional service provider metadata",
                        nullable: true,
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                    },
                },
                required: ["id", "name", "createdAt", "updatedAt"],
            },
            CreateServiceProviderRequest: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        description: "Service provider name",
                    },
                    description: {
                        type: "string",
                        description: "Service provider description",
                    },
                    metadata: {
                        type: "object",
                        description: "Additional metadata",
                    },
                },
                required: ["name"],
            },
            // Subscription Schemas
            Subscription: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "cuid",
                        description: "Unique subscription identifier",
                    },
                    serviceProviderId: {
                        type: "string",
                        format: "cuid",
                        description: "Associated service provider ID",
                    },
                    name: {
                        type: "string",
                        description: "Subscription name",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Subscription email",
                    },
                    availableSlots: {
                        type: "integer",
                        minimum: 1,
                        description: "Number of available sharing slots",
                    },
                    country: {
                        type: "string",
                        description: "Country restriction",
                        nullable: true,
                    },
                    expiresAt: {
                        type: "string",
                        format: "date-time",
                        description: "Subscription expiration date",
                        nullable: true,
                    },
                    userPrice: {
                        type: "number",
                        format: "decimal",
                        description: "Price per user slot",
                        nullable: true,
                    },
                    currency: {
                        type: "string",
                        description: "Currency code (e.g., USD, EUR)",
                        nullable: true,
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether subscription is active",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                    },
                    serviceProvider: {
                        $ref: "#/components/schemas/ServiceProvider",
                    },
                },
                required: [
                    "id",
                    "serviceProviderId",
                    "name",
                    "email",
                    "availableSlots",
                    "isActive",
                    "createdAt",
                    "updatedAt",
                ],
            },
            CreateSubscriptionRequest: {
                type: "object",
                properties: {
                    serviceProviderId: {
                        type: "string",
                        format: "cuid",
                        description: "Service provider ID",
                    },
                    name: {
                        type: "string",
                        minLength: 1,
                        description: "Subscription name",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Subscription email",
                    },
                    password: {
                        type: "string",
                        description: "Subscription password",
                    },
                    availableSlots: {
                        type: "integer",
                        minimum: 1,
                        maximum: 10,
                        description: "Number of available slots (1-10)",
                    },
                    country: {
                        type: "string",
                        description: "Country restriction",
                    },
                    expiresAt: {
                        type: "string",
                        format: "date-time",
                        description: "Subscription expiration date",
                    },
                    userPrice: {
                        type: "number",
                        format: "decimal",
                        minimum: 0,
                        description: "Price per user slot",
                    },
                    currency: {
                        type: "string",
                        enum: ["USD", "EUR", "GBP", "CAD", "AUD"],
                        description: "Currency code",
                    },
                },
                required: [
                    "serviceProviderId",
                    "name",
                    "email",
                    "password",
                    "availableSlots",
                ],
            },
            // Country Schemas
            Country: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "cuid",
                        description: "Unique country identifier",
                    },
                    name: {
                        type: "string",
                        description: "Country name",
                    },
                    code: {
                        type: "string",
                        pattern: "^[A-Z]{2}$",
                        description: "ISO 3166-1 alpha-2 country code (e.g., US, GB, CA)",
                    },
                    alpha3: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 3166-1 alpha-3 country code (e.g., USA, GBR, CAN)",
                    },
                    numericCode: {
                        type: "string",
                        pattern: "^\\d{3}$",
                        description: "ISO 3166-1 numeric country code (e.g., 840, 826, 124)",
                        nullable: true,
                    },
                    continent: {
                        type: "string",
                        description: "Continent name",
                        nullable: true,
                    },
                    region: {
                        type: "string",
                        description: "Geographic region",
                        nullable: true,
                    },
                    currency: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 4217 currency code (e.g., USD, EUR, GBP)",
                        nullable: true,
                    },
                    phoneCode: {
                        type: "string",
                        pattern: "^\\+\\d{1,4}$",
                        description: "International phone code (e.g., +1, +44, +33)",
                        nullable: true,
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether the country is active",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Country creation timestamp",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                    },
                },
                required: [
                    "id",
                    "name",
                    "code",
                    "alpha3",
                    "isActive",
                    "createdAt",
                    "updatedAt",
                ],
            },
            CreateCountryRequest: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Country name (required, max 100 characters)",
                    },
                    code: {
                        type: "string",
                        pattern: "^[A-Z]{2}$",
                        description: "ISO 3166-1 alpha-2 country code (required, 2 uppercase letters)",
                    },
                    alpha3: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 3166-1 alpha-3 country code (required, 3 uppercase letters)",
                    },
                    numericCode: {
                        type: "string",
                        pattern: "^\\d{3}$",
                        description: "ISO 3166-1 numeric country code (optional, 3 digits)",
                    },
                    continent: {
                        type: "string",
                        description: "Continent name (optional)",
                    },
                    region: {
                        type: "string",
                        description: "Geographic region (optional)",
                    },
                    currency: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 4217 currency code (optional, 3 uppercase letters)",
                    },
                    phoneCode: {
                        type: "string",
                        pattern: "^\\+\\d{1,4}$",
                        description: "International phone code (optional, format: +X to +XXXX)",
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether the country is active (optional, defaults to true)",
                        default: true,
                    },
                },
                required: ["name", "code", "alpha3"],
            },
            UpdateCountryRequest: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Country name (max 100 characters)",
                    },
                    code: {
                        type: "string",
                        pattern: "^[A-Z]{2}$",
                        description: "ISO 3166-1 alpha-2 country code (2 uppercase letters)",
                    },
                    alpha3: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 3166-1 alpha-3 country code (3 uppercase letters)",
                    },
                    numericCode: {
                        type: "string",
                        pattern: "^\\d{3}$",
                        description: "ISO 3166-1 numeric country code (3 digits)",
                    },
                    continent: {
                        type: "string",
                        description: "Continent name",
                    },
                    region: {
                        type: "string",
                        description: "Geographic region",
                    },
                    currency: {
                        type: "string",
                        pattern: "^[A-Z]{3}$",
                        description: "ISO 4217 currency code (3 uppercase letters)",
                    },
                    phoneCode: {
                        type: "string",
                        pattern: "^\\+\\d{1,4}$",
                        description: "International phone code (format: +X to +XXXX)",
                    },
                    isActive: {
                        type: "boolean",
                        description: "Whether the country is active",
                    },
                },
            },
            CountryResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [true],
                    },
                    data: {
                        $ref: "#/components/schemas/Country",
                    },
                    message: {
                        type: "string",
                        description: "Optional success message",
                    },
                },
                required: ["success", "data"],
            },
            CountryListResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [true],
                    },
                    data: {
                        type: "object",
                        properties: {
                            countries: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/Country",
                                },
                                description: "List of countries",
                            },
                            total: {
                                type: "integer",
                                description: "Total number of countries",
                            },
                            page: {
                                type: "integer",
                                description: "Current page number",
                            },
                            limit: {
                                type: "integer",
                                description: "Number of items per page",
                            },
                            hasNext: {
                                type: "boolean",
                                description: "Whether there are more pages",
                            },
                            hasPrevious: {
                                type: "boolean",
                                description: "Whether there are previous pages",
                            },
                        },
                        required: [
                            "countries",
                            "total",
                            "page",
                            "limit",
                            "hasNext",
                            "hasPrevious",
                        ],
                    },
                },
                required: ["success", "data"],
            },
            // Admin Schemas
            AdminDashboard: {
                type: "object",
                properties: {
                    statistics: {
                        type: "object",
                        properties: {
                            totalUsers: {
                                type: "integer",
                                description: "Total number of users",
                            },
                            totalSubscriptions: {
                                type: "integer",
                                description: "Total number of subscriptions",
                            },
                            totalServiceProviders: {
                                type: "integer",
                                description: "Total number of service providers",
                            },
                        },
                        required: [
                            "totalUsers",
                            "totalSubscriptions",
                            "totalServiceProviders",
                        ],
                    },
                    lastUpdated: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                    },
                },
                required: ["statistics", "lastUpdated"],
            },
            CreateAdminRequest: {
                type: "object",
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        description: "Admin email address",
                    },
                    password: {
                        type: "string",
                        minLength: 8,
                        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
                        description: "Strong password with uppercase, lowercase, number, and special character",
                    },
                    name: {
                        type: "string",
                        minLength: 2,
                        description: "Admin display name",
                    },
                },
                required: ["email", "password", "name"],
            },
            UpdateUserStatusRequest: {
                type: "object",
                properties: {
                    isActive: {
                        type: "boolean",
                        description: "User active status",
                    },
                },
                required: ["isActive"],
            },
            // Common Response Schemas
            SuccessResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [true],
                    },
                    data: {
                        type: "object",
                        description: "Response data",
                    },
                    message: {
                        type: "string",
                        description: "Optional success message",
                    },
                },
                required: ["success"],
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [false],
                    },
                    error: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                description: "Error code",
                            },
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                            details: {
                                type: "object",
                                description: "Additional error details",
                            },
                        },
                        required: ["code", "message"],
                    },
                },
                required: ["success", "error"],
            },
            ValidationErrorResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [false],
                    },
                    error: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                enum: ["VALIDATION_ERROR"],
                            },
                            message: {
                                type: "string",
                                enum: ["Validation failed"],
                            },
                            details: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        field: {
                                            type: "string",
                                        },
                                        message: {
                                            type: "string",
                                        },
                                    },
                                },
                            },
                        },
                        required: ["code", "message", "details"],
                    },
                },
                required: ["success", "error"],
            },
            AuthResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        enum: [true],
                    },
                    data: {
                        type: "object",
                        properties: {
                            token: {
                                type: "string",
                                description: "JWT access token",
                            },
                            user: {
                                $ref: "#/components/schemas/UserResponse",
                            },
                        },
                        required: ["token", "user"],
                    },
                    message: {
                        type: "string",
                    },
                },
                required: ["success", "data"],
            },
        },
        responses: {
            UnauthorizedError: {
                description: "Authentication required",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ErrorResponse",
                        },
                        example: {
                            success: false,
                            error: {
                                code: "UNAUTHORIZED",
                                message: "Authentication required",
                            },
                        },
                    },
                },
            },
            ForbiddenError: {
                description: "Insufficient permissions",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ErrorResponse",
                        },
                        example: {
                            success: false,
                            error: {
                                code: "FORBIDDEN",
                                message: "Insufficient permissions",
                            },
                        },
                    },
                },
            },
            ValidationError: {
                description: "Validation error",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ValidationErrorResponse",
                        },
                    },
                },
            },
            NotFoundError: {
                description: "Resource not found",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ErrorResponse",
                        },
                        example: {
                            success: false,
                            error: {
                                code: "NOT_FOUND",
                                message: "Resource not found",
                            },
                        },
                    },
                },
            },
            InternalServerError: {
                description: "Internal server error",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ErrorResponse",
                        },
                        example: {
                            success: false,
                            error: {
                                code: "INTERNAL_ERROR",
                                message: "An unexpected error occurred",
                            },
                        },
                    },
                },
            },
            RateLimitError: {
                description: "Rate limit exceeded",
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ErrorResponse",
                        },
                        example: {
                            success: false,
                            error: {
                                code: "RATE_LIMIT_EXCEEDED",
                                message: "Too many requests, please try again later",
                            },
                        },
                    },
                },
            },
        },
    },
    security: [
        {
            BearerAuth: [],
        },
    ],
    tags: [
        {
            name: "Authentication",
            description: "User authentication and account management",
        },
        {
            name: "Users",
            description: "User profile and account operations",
        },
        {
            name: "Admin",
            description: "Administrative operations (admin access required)",
        },
        {
            name: "Service Providers",
            description: "Service provider management",
        },
        {
            name: "Subscriptions",
            description: "Subscription sharing platform",
        },
        {
            name: "Countries",
            description: "Country management with ISO codes and geographic information",
        },
    ],
};
const options = {
    definition: swaggerDefinition,
    apis: [
        "./src/routes/*.ts", // Include all route files
        "./src/controllers/**/*.ts", // Include controller files
        "./src/middleware/*.ts", // Include middleware files
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = exports.swaggerSpec;
//# sourceMappingURL=swagger.js.map