import { logger } from "@monorepo/shared-utils";
import { ActiveInfluencer, FetchTask } from "../types";
import { Producer } from "kafkajs";
import { Metrics } from "../metrics/index";
import { logMetric } from "../metrics/logger";
import { INFLUENCER_FETCH_TASKS_TOPIC } from "../kafka/client";

export interface SchedulerTick {
  (activeInfluencers: Map<number, ActiveInfluencer>): Promise<void>;
}

function createSchedulerTick(
  producer: Producer,
  metrics: Metrics | undefined
): SchedulerTick {
  return async (activeInfluencers: Map<number, ActiveInfluencer>) => {
    const start = Date.now();
    logger.info({ count: activeInfluencers.size }, "Starting scheduler tick");

    const now = new Date();
    const bucket = Math.floor(now.getTime() / 60000) * 60000;
    const targetMinuteTimestamp = new Date(bucket).toISOString();
    logger.debug(
      { targetMinuteTimestamp },
      "Calculated target minute timestamp"
    );

    const tasks: FetchTask[] = [];
    for (const [pk, influencer] of activeInfluencers) {
      tasks.push({
        pk,
        username: influencer.username,
        target_minute_timestamp: targetMinuteTimestamp,
      });
      logger.debug(
        { pk, targetMinuteTimestamp },
        "Scheduled task for influencer"
      );
    }

    if (tasks.length > 0) {
      logger.info({ count: tasks.length }, "Producing fetch tasks");
      try {
        await producer.send({
          topic: INFLUENCER_FETCH_TASKS_TOPIC,
          messages: tasks.map((task) => ({
            key: task.pk.toString(),
            value: JSON.stringify(task),
          })),
        });

        logMetric(metrics, {
          type: "increment",
          metric: "tasksProducedCounter",
        });

        logger.info(
          { count: tasks.length },
          "Successfully produced fetch tasks"
        );
      } catch (error) {
        logger.error(
          { error, count: tasks.length },
          "Failed to produce fetch tasks"
        );
        logMetric(metrics, {
          type: "increment",
          metric: "tasksFailedCounter",
        });
      }
    } else {
      logger.info("No tasks to produce in this tick");
    }

    const duration = (Date.now() - start) / 1000;
    logMetric(metrics, {
      type: "observe",
      metric: "tickDurationHistogram",
      value: duration,
    });

    logger.info(
      { count: activeInfluencers.size, duration },
      "Scheduler tick completed successfully"
    );
  };
}

export function startSchedulerInterval(
  producer: Producer,
  activeInfluencers: Map<number, ActiveInfluencer>,
  metrics: Metrics | undefined,
  interval: number = 60000 // 1 minute default
): void {
  const tick = createSchedulerTick(producer, metrics);

  // Calculate time until next minute boundary in UTC
  const now = new Date();
  const utcSeconds = now.getUTCSeconds();
  const utcMilliseconds = now.getUTCMilliseconds();
  const delay = (60 - utcSeconds) * 1000 - utcMilliseconds;
  logger.info({ delay }, "Waiting for next minute boundary");

  // Wait until the next minute boundary
  setTimeout(() => {
    // Start the interval exactly at the minute boundary
    setInterval(() => tick(activeInfluencers), interval);
    logger.info({ interval }, "Interval scheduler started successfully");
  }, delay);
}
