import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { context, trace } from '@opentelemetry/api';
import { logger } from './logging.js';

let sdk: NodeSDK | undefined;

export async function initOpenTelemetry(serviceName: string, serviceVersion: string): Promise<void> {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.JAEGER_ENDPOINT || 'http://jaeger:4318/v1/traces',
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    await sdk.start();
    logger.info('OpenTelemetry SDK started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start OpenTelemetry SDK');
    throw error;
  }
}

export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      logger.error({ error }, 'Error shutting down OpenTelemetry SDK');
      throw error;
    }
  }
}

export function getTraceSpanIds(): { traceId: string; spanId: string } {
  const currentSpan = trace.getActiveSpan();
  if (!currentSpan) {
    return { traceId: '', spanId: '' };
  }

  const spanContext = currentSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
} 