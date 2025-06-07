import express from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "./config/passport";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

/**
 * Express application setup
 */
class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
      })
    );

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // JSON parsing error handler
    this.app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
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
              details:
                process.env.NODE_ENV === "development"
                  ? {
                      originalError: error.message,
                      tip: "Check for trailing commas, unescaped quotes, or other JSON syntax errors",
                    }
                  : undefined,
            },
          });
        }
        next(error);
      }
    );

    // Passport middleware
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res
        .status(200)
        .json({ status: "OK", timestamp: new Date().toISOString() });
    });

    // Swagger API Documentation
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
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
      })
    );

    // API routes
    this.app.use("/api", routes);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }
}

export default App;
