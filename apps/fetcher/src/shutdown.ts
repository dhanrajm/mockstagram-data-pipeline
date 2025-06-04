import { Producer, Consumer } from "kafkajs";
import { logger, shutdownOpenTelemetry } from "@monorepo/shared-utils";

export function setupShutdownHandlers(
  producer: Producer,
  consumer: Consumer
): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Received shutdown signal");

    try {
      await producer.disconnect();
      logger.info("Kafka producer disconnected successfully");
      await consumer.disconnect();
      logger.info("Kafka consumer disconnected successfully");

      if (process.env.ENABLE_TRACING === "true") {
        await shutdownOpenTelemetry();
        logger.info("OpenTelemetry disconnected successfully");
      }
    } catch (error) {
      logger.error({ error }, "Error disconnecting Kafka producer");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
