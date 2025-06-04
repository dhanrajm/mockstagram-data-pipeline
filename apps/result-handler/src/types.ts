import { Consumer, Producer } from "kafkajs";
import { Pool } from "pg";
import { Metrics } from "./metrics";

export interface FetcherResult {
  pk: number;
  username: string;
  followerCount: number;
  fetchTimestamp: Date;
}

export interface FailedDbOperation {
  pk: number;
  error: string;
  data: string;
}

export interface ShutdownHandlers {
  consumer: Consumer;
  producer: Producer;
  pool: Pool;
  metrics: Metrics | undefined;
} 