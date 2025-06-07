"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const passport_1 = __importDefault(require("./config/passport"));
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = __importDefault(require("./routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
/**
 * Express application setup
 */
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        // Security middleware
        this.app.use((0, helmet_1.default)());
        // CORS middleware
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGIN || "http://localhost:3000",
            credentials: true,
        }));
        // Body parsing middleware
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // JSON parsing error handler
        this.app.use((error, req, res, next) => {
            if (error instanceof SyntaxError && error.message.includes("JSON")) {
                console.error("JSON parsing failed for request:", {
                    method: req.method,
                    url: req.url,
                    error: error.message,
                });
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "INVALID_JSON",
                        message: "Invalid JSON format in request body",
                        details: process.env.NODE_ENV === "development"
                            ? {
                                originalError: error.message,
                                tip: "Check for trailing commas, unescaped quotes, or other JSON syntax errors",
                            }
                            : undefined,
                    },
                });
            }
            next(error);
        });
        // Passport middleware
        this.app.use(passport_1.default.initialize());
    }
    initializeRoutes() {
        // Health check endpoint
        this.app.get("/health", (req, res) => {
            res
                .status(200)
                .json({ status: "OK", timestamp: new Date().toISOString() });
        });
        // Swagger API Documentation
        this.app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default, {
            customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 50px 0 }
        .swagger-ui .info .title { color: #3b82f6 }
      `,
            customSiteTitle: "BuddyPass API Documentation",
            customfavIcon: "/favicon.ico",
            swaggerOptions: {
                docExpansion: "none",
                defaultModelRendering: "model",
                defaultModelsExpandDepth: 2,
                defaultModelExpandDepth: 2,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
            },
        }));
        // API routes
        this.app.use("/api", routes_1.default);
    }
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
}
exports.default = App;
//# sourceMappingURL=app.js.map