import App from "./app";
import { container } from "./container";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { logger } from "./utils/logger";
import { startSlotMaintenance } from "./jobs/slotMaintenance";

async function start(): Promise<void> {
  await connectDatabase();
  if (env.NODE_ENV !== "test") {
    startSlotMaintenance();
  }

  if (env.SMTP_HOST && env.SMTP_FROM) {
    logger.info({ host: env.SMTP_HOST }, "Outbound mail enabled");
  } else {
    logger.warn(
      "Outbound mail is off. Notices stay in the app until SMTP_HOST and SMTP_FROM are set."
    );
  }

  const app = new App();
  const server = app.app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      "Server started"
    );
  });
  container.getNotificationPublisher().attach(server);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Server shutting down");
    await container.getNotificationPublisher().close();
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
