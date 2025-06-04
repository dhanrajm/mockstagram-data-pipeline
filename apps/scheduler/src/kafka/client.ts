import { Kafka, Producer, Consumer } from "kafkajs";
import { logger } from "@monorepo/shared-utils";

export const ACTIVE_INFLUENCERS_TOPIC =
  process.env.ACTIVE_INFLUENCERS_TOPIC || "active_influencers";
export const INFLUENCER_FETCH_TASKS_TOPIC =
  process.env.INFLUENCER_FETCH_TASKS_TOPIC || "influencer_fetch_tasks";

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;

  constructor() {
    this.kafka = new Kafka({
      clientId: "scheduler",
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    });
  }

  async connect(): Promise<void> {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      logger.info("Kafka producer connected successfully");
    } catch (error) {
      logger.error({ error }, "Failed to connect Kafka producer");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      logger.info("Kafka producer disconnected successfully");
    }
  }

  getProducer(): Producer {
    if (!this.producer) {
      throw new Error("Producer not initialized. Call connect() first.");
    }
    return this.producer;
  }

  getConsumer(): Consumer {
    if (!this.consumer) {
      /**
       * Generate random group ID so that each instance of the scheduler
       * will have a unique group ID. This will allow it to read all
       * active influencers.
       */
      const randomGroupId = `scheduler-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      this.consumer = this.kafka.consumer({ groupId: randomGroupId });
      logger.info(
        { groupId: randomGroupId },
        "Created consumer with random group ID"
      );
    }
    return this.consumer;
  }
}
