import App from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { logger } from "./utils/logger";
import { startSlotMaintenance } from "./jobs/slotMaintenance";

async function start(): Promise<void> {
  await connectDatabase();
  if (env.NODE_ENV !== "test") {
    startSlotMaintenance();
  }

  const app = new App();
  const server = app.app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      "Server started"
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Server shutting down");
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
