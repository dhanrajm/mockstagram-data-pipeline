import { Counter, Histogram, Registry } from "prom-client";

export interface Metrics {
  messagesConsumedCounter: Counter;
  dbOperationsCounter: Counter;
  dbOperationDurationHistogram: Histogram;
  messagesProducedCounter: Counter;
  failedDbOpsCounter: Counter;
  batchProcessingFailureCounter: Counter;
  metrics: () => Promise<string>;
}

export async function initializeMetrics(
  serviceName: string,
  serviceVersion: string
): Promise<Metrics> {
  const registry = new Registry();
  registry.setDefaultLabels({
    service: serviceName,
    version: serviceVersion,
  });

  const messagesConsumedCounter = new Counter({
    name: "result_handler_messages_consumed_total",
    help: "Total number of messages consumed",
    registers: [registry],
  });

  const dbOperationsCounter = new Counter({
    name: "result_handler_db_operations_total",
    help: "Total number of DB operations",
    registers: [registry],
  });

  const dbOperationDurationHistogram = new Histogram({
    name: "result_handler_db_operation_duration_seconds",
    help: "Duration of DB operations in seconds",
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [registry],
  });

  const messagesProducedCounter = new Counter({
    name: "result_handler_messages_produced_total",
    help: "Total number of messages produced",
    registers: [registry],
  });

  const failedDbOpsCounter = new Counter({
    name: "result_handler_failed_db_ops_total",
    help: "Total number of failed DB operations",
    registers: [registry],
  });

  const batchProcessingFailureCounter = new Counter({
    name: "result_handler_batch_processing_failures_total",
    help: "Total number of batch processing failures",
    registers: [registry],
  });

  return {
    messagesConsumedCounter,
    dbOperationsCounter,
    dbOperationDurationHistogram,
    messagesProducedCounter,
    failedDbOpsCounter,
    batchProcessingFailureCounter,
    metrics: () => registry.metrics(),
  };
}
