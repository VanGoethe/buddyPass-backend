import { container } from "../container";
import { logger } from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;

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

  void run();
  setInterval(() => {
    void run();
  }, HOUR_MS);
}
