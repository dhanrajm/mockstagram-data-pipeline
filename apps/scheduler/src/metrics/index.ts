import { Registry, Counter, Histogram, Gauge } from "prom-client";

export interface Metrics {
  tasksProducedCounter: Counter<string>;
  tasksFailedCounter: Counter<string>;
  tickDurationHistogram: Histogram<string>;
  activeInfluencersGauge: Gauge<string>;
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

  const tasksProducedCounter = new Counter({
    name: "scheduler_tasks_produced_total",
    help: "Total number of tasks produced by the scheduler",
    registers: [registry],
  });

  const tasksFailedCounter = new Counter({
    name: "scheduler_tasks_failed_total",
    help: "Total number of tasks that failed to be produced",
    registers: [registry],
  });

  const tickDurationHistogram = new Histogram({
    name: "scheduler_tick_duration_seconds",
    help: "Duration of scheduler ticks in seconds",
    registers: [registry],
  });

  const activeInfluencersGauge = new Gauge({
    name: "scheduler_active_influencers",
    help: "Number of active influencers in the registry",
    registers: [registry],
  });

  return {
    tasksProducedCounter,
    tasksFailedCounter,
    tickDurationHistogram,
    activeInfluencersGauge,
    metrics: () => registry.metrics(),
  };
}
