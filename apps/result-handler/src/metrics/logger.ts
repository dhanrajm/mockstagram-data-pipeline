import { Metrics } from "./index";

type MetricAction = {
  type: 'increment' | 'observe';
  metric: keyof Pick<Metrics, 
    'messagesConsumedCounter' | 
    'dbOperationsCounter' | 
    'dbOperationDurationHistogram' | 
    'messagesProducedCounter' | 
    'failedDbOpsCounter' |
    'batchProcessingFailureCounter'
  >;
  value?: number;
};

export function logMetric(metrics: Metrics | undefined, action: MetricAction): void {
  if (!metrics) return;

  const metric = metrics[action.metric];
  if (!metric) return;

  if (action.type === 'increment') {
    (metric as any).inc();
  } else if (action.type === 'observe' && action.value !== undefined) {
    (metric as any).observe(action.value);
  }
} 