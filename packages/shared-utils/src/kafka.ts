import { Kafka, KafkaConfig, Producer, Consumer } from 'kafkajs';
import { logger } from './logging.js';

export interface KafkaClientConfig {
  clientId: string;
  brokers: string[];
  connectionTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(config: KafkaClientConfig) {
    const kafkaConfig: KafkaConfig = {
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 3000,
      retry: {
        initialRetryTime: config.retry?.initialRetryTime || 100,
        retries: config.retry?.retries || 8,
      },
    };

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.clientId });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect Kafka producer');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      logger.info('Kafka client disconnected successfully');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting Kafka client');
      throw error;
    }
  }

  getProducer(): Producer {
    return this.producer;
  }

  getConsumer(): Consumer {
    return this.consumer;
  }
}

export function createKafkaClient(config: KafkaClientConfig): KafkaClient {
  return new KafkaClient(config);
} 