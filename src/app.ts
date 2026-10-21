import express from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "./config/passport";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { globalRateLimiter } from "./middleware/rateLimit";
import routes from "./routes";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { env } from "./config/env";
import { getPrismaClient } from "./config/database";

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    if (env.TRUST_PROXY) {
      this.app.set("trust proxy", 1);
    }

    this.app.use(helmet());
    this.app.use(
      cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: "100kb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "100kb" }));
    this.app.use(requestLogger);
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    this.app.get("/health", async (_req, res) => {
      try {
        await getPrismaClient().$queryRaw`SELECT 1`;
        res.status(200).json({
          status: "OK",
          timestamp: new Date().toISOString(),
        });
      } catch {
        res.status(503).json({
          status: "UNAVAILABLE",
          timestamp: new Date().toISOString(),
        });
      }
    });

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
        swaggerOptions: {
          docExpansion: "none",
          tryItOutEnabled: env.NODE_ENV !== "production",
        },
      })
    );

    this.app.use("/api", globalRateLimiter, routes);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }
}

export default App;
