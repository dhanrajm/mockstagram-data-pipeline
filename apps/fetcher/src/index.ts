import dotenv from "dotenv";
dotenv.config();

import {
  createKafkaClient,
  initOpenTelemetry,
  logger,
} from "@monorepo/shared-utils";
import { FetchTask, FailedTask } from "./types";
import { createMetricsRegistry, Metrics } from "./metrics";
import { startMetricsServer } from "./metrics/server";
import { fetchInfluencerData } from "./api";
import { logMetric } from "./metrics/logger";
import { setupShutdownHandlers } from "./shutdown";

const SERVICE_NAME = process.env.SERVICE_NAME || "fetcher";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

const INFLUENCER_FETCH_TASKS_TOPIC =
  process.env.INFLUENCER_FETCH_TASKS_TOPIC || "influencer_fetch_tasks";
const FETCHER_RESULT_TOPIC =
  process.env.FETCHER_RESULT_TOPIC || "fetcher_results";
const FETCHER_DLQ_TOPIC = process.env.FETCHER_DLQ_TOPIC || "fetcher_dlq";

async function start() {
  logger.info("Starting fetcher service");
  // Initialize OpenTelemetry if enabled
  if (process.env.ENABLE_TRACING === "true") {
    logger.debug("Initializing OpenTelemetry");
    await initOpenTelemetry(SERVICE_NAME, SERVICE_VERSION);
    logger.debug("OpenTelemetry initialized");
  }

  // Initialize metrics if enabled
  let metrics: Metrics | undefined;
  if (process.env.ENABLE_METRICS === "true") {
    logger.debug("Initializing metrics");
    metrics = await createMetricsRegistry(SERVICE_NAME, SERVICE_VERSION);
    logger.debug("Metrics initialized");

    // Start metrics server if enabled
    const port = parseInt(process.env.METRICS_PORT || "9090", 10);
    logger.debug(`Starting metrics server on port ${port}`);
    await startMetricsServer(port, metrics);
    logger.debug("Metrics server started");
  }

  // Initialize Kafka client
  logger.debug("Initializing Kafka client");
  const kafka = createKafkaClient({
    clientId: "fetcher",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  });
  logger.debug("Kafka client initialized");
  await kafka.connect();
  logger.debug("Kafka client connected");

  // Initialize consumer and producer
  const consumer = kafka.getConsumer();
  const producer = kafka.getProducer();

  await consumer.subscribe({ topic: INFLUENCER_FETCH_TASKS_TOPIC });
  logger.debug("Consumer subscribed to influencer_fetch_tasks topic");

  logger.debug("Starting consumer run");
  // Process messages from influencer_fetch_tasks topic
  await consumer.run({
    eachMessage: async ({ message }) => {
      logger.debug("Received message", {
        topic: INFLUENCER_FETCH_TASKS_TOPIC,
        message,
      });
      if (!message.value) return;

      const task: FetchTask = JSON.parse(message.value.toString());
      logger.debug("Parsed task", { task });
      logMetric(metrics, {
        type: "increment",
        metric: "messagesConsumedCounter",
      });

      // check if target_minute_timestamp is in current window
      const targetTime = new Date(task.target_minute_timestamp).getTime();
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000) * 60000;
      const nextMinute = currentMinute + 60000;

      if (targetTime < currentMinute || targetTime >= nextMinute) {
        logger.debug(
          "Target minute timestamp is not in current window, skipping",
          {
            targetTime,
            currentMinute,
            nextMinute,
          }
        );
        logMetric(metrics, {
          type: "increment",
          metric: "skippedTasksCounter",
        });
        return;
      }

      try {
        logger.debug("Fetching influencer data");
        const result = await fetchInfluencerData(task.pk, metrics);
        logger.debug("Fetched influencer data", { result });
        await producer.send({
          topic: FETCHER_RESULT_TOPIC,
          messages: [
            {
              key: result.pk.toString(),
              value: JSON.stringify(result),
            },
          ],
        });
        logger.debug("Sent result to topic", {
          topic: FETCHER_RESULT_TOPIC,
          result,
        });

        logMetric(metrics, {
          type: "increment",
          metric: "messagesProducedCounter",
        });
      } catch (error) {
        logger.error({ error, task }, "Failed to fetch influencer data");
        logMetric(metrics, {
          type: "increment",
          metric: "failedTasksCounter",
        });

        const failedTask: FailedTask = {
          pk: task.pk,
          targetMinuteTimestamp: task.target_minute_timestamp,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        await producer.send({
          topic: FETCHER_DLQ_TOPIC,
          messages: [
            {
              key: failedTask.pk.toString(),
              value: JSON.stringify(failedTask),
            },
          ],
        });
        logger.debug("Sent failed task to topic", {
          topic: FETCHER_DLQ_TOPIC,
          failedTask,
        });
      }
    },
  });

  setupShutdownHandlers(producer, consumer);
  logger.debug("Consumer run started");
}

start();
