import dotenv from "dotenv";
dotenv.config();

import { initializeMetrics, Metrics } from "./metrics/index";
import { startMetricsServer } from "./metrics/server";
import { logMetric } from "./metrics/logger";
import { initializeKafka } from "./kafka";
import { initializeDatabase } from "./database";
import {
  initOpenTelemetry,
  logger,
  shutdownOpenTelemetry,
} from "@monorepo/shared-utils";
import { FetcherResult, FailedDbOperation, ShutdownHandlers } from "./types";
import { Pool } from "pg";
import { Producer, KafkaMessage } from "kafkajs";

const FETCHER_RESULT_TOPIC = process.env.FETCHER_RESULT_TOPIC || "fetcher_results";
const RESULT_HANDLER_DLQ_TOPIC = process.env.RESULT_HANDLER_DLQ_TOPIC || "result_handler_dlq";
const SERVICE_NAME = process.env.SERVICE_NAME || "result-handler";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

async function start() {
  try {
    if (process.env.ENABLE_TRACING === "true") {
      // Initialize OpenTelemetry
      await initOpenTelemetry("result-handler", "1.0.0");
    }

    let metrics: Metrics | undefined;
    if (process.env.ENABLE_METRICS === "true") {
      metrics = await initializeMetrics(SERVICE_NAME, SERVICE_VERSION);

      // Start metrics server if enabled
      const port = parseInt(process.env.METRICS_PORT || "9090", 10);
      await startMetricsServer(port, metrics);
    }

    const { consumer, producer } = await initializeKafka();
    const pool = await initializeDatabase();

    // Subscribe to Kafka topic
    await consumer.subscribe({ topic: FETCHER_RESULT_TOPIC });

    // Set up message processing
    await consumer.run({
      eachMessage: async ({ message }: { message: KafkaMessage }) => {
        if (!message.value) return;
        logMetric(metrics, {
          type: "increment",
          metric: "messagesConsumedCounter",
        });

        try {
          const result = JSON.parse(message.value.toString()) as FetcherResult;
          if (!result) {
            throw new Error("Parsed result is null or undefined");
          }
          await handleResult(result, pool, metrics);
        } catch (error) {
          await handleError(error, message, producer, metrics);
        }
      },
    });

    // Set up graceful shutdown
    setupShutdownHandlers({ consumer, producer, pool, metrics });
  } catch (error) {
    logger.error({ error }, "Failed to start result handler");
    process.exit(1);
  }
}

async function handleResult(
  result: FetcherResult,
  pool: Pool,
  metrics: Metrics | undefined
) {
  logger.info({ result }, "Handling result");
  const start = Date.now();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Upsert into influencer_summary
    await client.query(
      `INSERT INTO influencer_summary (
        pk,
        username,
        current_follower_count,
        total_follower_sum,
        readings_count,
        last_updated
      ) VALUES (
        $1,
        $2,
        $3,
        $3,
        1,
        $4
      )
      ON CONFLICT (pk) DO UPDATE SET
        username = EXCLUDED.username,
        current_follower_count = EXCLUDED.current_follower_count,
        total_follower_sum = influencer_summary.total_follower_sum + EXCLUDED.current_follower_count,
        readings_count = influencer_summary.readings_count + 1,
        last_updated = EXCLUDED.last_updated`,
      [result.pk, result.username, result.followerCount, result.fetchTimestamp]
    );

    // Insert into follower_timeline
    await client.query(
      `INSERT INTO follower_timeline (
        pk,
        timestamp,
        follower_count
      ) VALUES (
        $1,
        $2,
        $3
      )`,
      [result.pk, result.fetchTimestamp, result.followerCount]
    );

    await client.query("COMMIT");
    logMetric(metrics, { type: "increment", metric: "dbOperationsCounter" });

    const duration = (Date.now() - start) / 1000;
    logMetric(metrics, {
      type: "observe",
      metric: "dbOperationDurationHistogram",
      value: duration,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleError(
  error: unknown,
  message: KafkaMessage,
  producer: Producer,
  metrics: Metrics | undefined
) {
  logger.error(
    { error, message: message.value?.toString() },
    "DB operation failed"
  );
  logMetric(metrics, { type: "increment", metric: "failedDbOpsCounter" });

  const failed: FailedDbOperation = {
    pk: message.key ? parseInt(message.key.toString()) : -1,
    error: error instanceof Error ? error.message : "Unknown error",
    data: message.value?.toString() || "",
  };

  await producer.send({
    topic: RESULT_HANDLER_DLQ_TOPIC,
    messages: [
      {
        key: String(failed.pk),
        value: JSON.stringify(failed),
      },
    ],
  });
  logMetric(metrics, { type: "increment", metric: "messagesProducedCounter" });
}

function setupShutdownHandlers({
  consumer,
  producer,
  pool,
  metrics,
}: ShutdownHandlers) {
  const shutdown = async () => {
    try {
      await consumer.disconnect();
      await producer.disconnect();
      await pool.end();
      if (process.env.ENABLE_TRACING === "true") {
        await shutdownOpenTelemetry();
      }
      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM signal");
    await shutdown();
  });

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT signal");
    await shutdown();
  });
}

start();
