import { createKafkaClient } from "@monorepo/shared-utils";
import { Kafka, Consumer, Producer } from "kafkajs";

interface KafkaClients {
  consumer: Consumer;
  producer: Producer;
}

export async function initializeKafka(): Promise<KafkaClients> {
  const kafka = createKafkaClient({
    clientId: "result-handler",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  });

  await kafka.connect();
  return {
    consumer: kafka.getConsumer(),
    producer: kafka.getProducer(),
  };
} 