import pino from 'pino';
import { getTraceSpanIds } from './tracing.js';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: logLevel,
  mixin() {
    const { traceId, spanId } = getTraceSpanIds();
    return {
      traceId,
      spanId,
      service: process.env.SERVICE_NAME || 'unknown',
      timestamp: new Date().toISOString(),
    };
  },
  transport: {
    targets: [
      {
        target: 'pino/file',
        level: 'info',
        options: {
          destination: '/dev/stdout',
        },
      },
    ],
  },
}); 