import { logger, initOpenTelemetry } from "@monorepo/shared-utils";
import { KafkaClient } from "./kafka/client";
import { createConsumer } from "./kafka/consumer";
import { startSchedulerInterval } from "./scheduler/interval";
import { createMetricsRegistry, Metrics } from "./metrics";
import { startMetricsServer } from "./metrics/server";
import { setupShutdownHandlers } from "./shutdown";
import { ActiveInfluencer } from "./types";

const SERVICE_NAME = process.env.SERVICE_NAME || "scheduler";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

async function start() {
  try {
    // Initialize OpenTelemetry if enabled
    if (process.env.ENABLE_TRACING === "true") {
      await initOpenTelemetry(SERVICE_NAME, SERVICE_VERSION);
    }

    // Initialize metrics if enabled
    let metrics: Metrics | undefined;
    if (process.env.ENABLE_METRICS === "true") {
      metrics = await createMetricsRegistry(SERVICE_NAME, SERVICE_VERSION);

      // Start metrics server if enabled
      const port = parseInt(process.env.METRICS_PORT || "9090", 10);
      await startMetricsServer(port, metrics);
    }

    // Initialize Kafka client, producer and consumer
    const kafka = new KafkaClient();
    await kafka.connect();
    const producer = kafka.getProducer();
    const consumer = createConsumer(kafka, metrics);

    // Initialize active influencers map
    const activeInfluencers = new Map<number, ActiveInfluencer>();

    // Start consumer to populate active influencers
    await consumer.start(activeInfluencers);

    // Start the scheduler interval
    startSchedulerInterval(producer, activeInfluencers, metrics);

    // Setup shutdown handlers
    setupShutdownHandlers(producer, consumer);

    logger.info("Scheduler service started successfully");
  } catch (error) {
    logger.error({ error }, "Failed to start scheduler service");
    process.exit(1);
  }
}

// Start the service
start();
