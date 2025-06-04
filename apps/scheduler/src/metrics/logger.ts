import { Counter, Histogram, Gauge } from "prom-client";
import { Metrics } from "../metrics";

export type MetricAction = {
  type: "increment" | "observe";
  metric: "tasksProducedCounter" | "tasksFailedCounter" | "tickDurationHistogram" | "activeInfluencersGauge";
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
    if (action.metric === "activeInfluencersGauge") {
      (metric as Gauge<string>).set(action.value);
    } else {
      (metric as Histogram<string>).observe(action.value);
    }
  }
}
