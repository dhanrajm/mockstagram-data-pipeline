import { Consumer } from "kafkajs";
import { logger } from "@monorepo/shared-utils";
import { ActiveInfluencer } from "../types";
import { ACTIVE_INFLUENCERS_TOPIC, KafkaClient } from "./client";
import { Metrics } from "../metrics";
import { logMetric } from "../metrics/logger";

interface SchedulerConsumer extends Consumer {
  start(activeInfluencers: Map<number, ActiveInfluencer>): Promise<void>;
}

export function createConsumer(
  kafka: KafkaClient,
  metrics: Metrics | undefined
): SchedulerConsumer {
  const consumer = kafka.getConsumer();

  return {
    ...consumer,
    async start(activeInfluencers: Map<number, ActiveInfluencer>) {
      logger.info(
        { topic: ACTIVE_INFLUENCERS_TOPIC },
        "Starting Kafka consumer for active influencers"
      );

      try {
        await consumer.connect();
        logger.info("Consumer connected successfully");
      } catch (error) {
        logger.error({ error }, "Failed to connect consumer");
        throw error;
      }

      try {
        await consumer.subscribe({
          topic: ACTIVE_INFLUENCERS_TOPIC,
          fromBeginning: true,
        });
        logger.info(`Subscribed to topic: ${ACTIVE_INFLUENCERS_TOPIC}`);
      } catch (error) {
        logger.error(
          { error, topic: ACTIVE_INFLUENCERS_TOPIC },
          "Failed to subscribe to topic"
        );
        throw error;
      }

      try {
        await consumer.run({
          eachMessage: async ({
            message,
          }: {
            message: { value: Buffer | null };
          }) => {
            logger.debug(
              { message, topic: ACTIVE_INFLUENCERS_TOPIC },
              "Received message"
            );
            if (!message.value) {
              logger.warn("Received message with null value");
              return;
            }

            try {
              const influencer: ActiveInfluencer = JSON.parse(
                message.value.toString()
              );
              logger.debug({ influencer }, "Processing influencer update");

              if (influencer.active) {
                activeInfluencers.set(influencer.pk, influencer);
                logger.info(
                  { pk: influencer.pk },
                  "Added active influencer to registry"
                );
              } else {
                activeInfluencers.delete(influencer.pk);
                logger.info(
                  { pk: influencer.pk },
                  "Removed inactive influencer from registry"
                );
              }

              logMetric(metrics, {
                type: "observe",
                metric: "activeInfluencersGauge",
                value: activeInfluencers.size,
              });
            } catch (error) {
              logger.error(
                { error, message: message.value.toString() },
                "Failed to process influencer message"
              );
            }
          },
        });
        logger.info("Consumer started successfully");
      } catch (error) {
        logger.error({ error }, "Failed to start consumer");
        throw error;
      }
    },
  };
}
