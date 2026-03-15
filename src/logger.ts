/**
 * Shared Pino logger instance. Uses pino-pretty in development.
 * Automatically includes requestId from AsyncLocalStorage when
 * logging inside a request lifecycle.
 */
import pino from 'pino';
import { requestContext } from './request-context.js';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  mixin() {
    const ctx = requestContext.getStore();
    return ctx ? { requestId: ctx.requestId } : {};
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
    },
  }),
});

export default logger;
