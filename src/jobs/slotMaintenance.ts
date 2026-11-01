import { container } from "../container";
import { logger } from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function startSlotMaintenance(): void {
  const run = async (): Promise<void> => {
    try {
      const result = await container.getSlotAssignmentService().sweepSeatTerms();
      if (result.releasedHolds + result.blocked + result.releasedBlocked > 0) {
        logger.info(result, "Seat term sweep finished");
      }
    } catch (error) {
      logger.error({ err: error }, "Seat term sweep failed");
    }
  };

  const inbox = async (): Promise<void> => {
    try {
      const stored = await container.getLoginCodeQueue().maintain();
      if (stored > 0) {
        logger.info({ stored }, "Login codes stored");
      }
    } catch (error) {
      logger.error({ err: error }, "Login code poll failed");
    }
  };

  const forecast = async (): Promise<void> => {
    try {
      await container.getCapacityForecastService().recomputeActivePools();
    } catch (error) {
      logger.error({ err: error }, "Capacity forecast sweep failed");
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, HOUR_MS);

  void forecast();
  setInterval(() => {
    void forecast();
  }, FIFTEEN_MINUTES_MS);

  void inbox();
  setInterval(() => {
    void inbox();
  }, MINUTE_MS);
}
