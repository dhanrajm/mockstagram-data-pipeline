import { Counter, Histogram, Gauge } from "prom-client";
import { Metrics } from "../metrics";

export type MetricAction = {
  type: "increment" | "observe";
  metric: "messagesConsumedCounter" | "messagesProducedCounter" | "failedTasksCounter" | "skippedTasksCounter" | "apiCallsCounter" | "apiCallDurationHistogram";
  value?: number;
};

export function logMetric(metrics: Metrics | undefined, action: MetricAction): void {
  if (!metrics) return;

  const metric = metrics[action.metric];
  if (!metric) {
    return;
  }

  if (action.type === "increment") {
    (metric as Counter<string>).inc();
  } else if (action.type === "observe" && action.value !== undefined) {
    if (action.metric === "apiCallDurationHistogram") {
      (metric as Histogram<string>).observe(action.value);
    } else {
      (metric as Counter<string>).inc(action.value);
    }
  }
}
