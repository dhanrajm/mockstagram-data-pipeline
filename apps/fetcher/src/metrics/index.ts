import { Registry, Counter, Histogram, Gauge } from "prom-client";

export interface Metrics {
  messagesConsumedCounter: Counter<string>;
  messagesProducedCounter: Counter<string>;
  failedTasksCounter: Counter<string>;
  skippedTasksCounter: Counter<string>;
  apiCallsCounter: Counter<string>;
  apiCallDurationHistogram: Histogram<string>;
  metrics: () => Promise<string>;
}

export async function createMetricsRegistry(
  serviceName: string,
  serviceVersion: string
): Promise<Metrics> {
  const registry = new Registry();
  registry.setDefaultLabels({
    service: serviceName,
    version: serviceVersion,
  });

  const messagesConsumedCounter = new Counter({
    name: "fetcher_messages_consumed_total",
    help: "Total number of messages consumed from Kafka",
    registers: [registry],
  });

  const messagesProducedCounter = new Counter({
    name: "fetcher_messages_produced_total",
    help: "Total number of messages produced to Kafka",
    registers: [registry],
  });

  const failedTasksCounter = new Counter({
    name: "fetcher_failed_tasks_total",
    help: "Total number of tasks that failed to be processed",
    registers: [registry],
  });

  const skippedTasksCounter = new Counter({
    name: "fetcher_skipped_tasks_total",
    help: "Total number of tasks that were skipped due to being in the past",
    registers: [registry],
  });

  const apiCallsCounter = new Counter({
    name: "fetcher_api_calls_total",
    help: "Total number of API calls made",
    registers: [registry],
  });

  const apiCallDurationHistogram = new Histogram({
    name: "fetcher_api_call_duration_seconds",
    help: "Duration of API calls in seconds",
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [registry],
  });

  return {
    messagesConsumedCounter,
    messagesProducedCounter,
    failedTasksCounter,
    skippedTasksCounter,
    apiCallsCounter,
    apiCallDurationHistogram,
    metrics: () => registry.metrics(),
  };
}
