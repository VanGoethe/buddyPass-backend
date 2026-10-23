import { container } from "../container";
import { logger } from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function startSlotMaintenance(): void {
  const run = async (): Promise<void> => {
    try {
      const released = await container
        .getSlotAssignmentService()
        .releaseExpiredSlots();
      if (released > 0) {
        logger.info({ released }, "Released slots on expired subscriptions");
      }
    } catch (error) {
      logger.error({ err: error }, "Expired slot sweep failed");
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
}
