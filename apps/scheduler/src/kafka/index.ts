import { Kafka, Producer } from "kafkajs";
import { logger } from "@monorepo/shared-utils";

export function createKafkaClient(): Kafka {
  return new Kafka({
    clientId: "scheduler",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  });
}

export async function createKafkaProducer(): Promise<Producer> {
  const kafka = createKafkaClient();
  const producer = kafka.producer();
  await producer.connect();
  logger.info("Kafka producer connected successfully");
  return producer;
} 