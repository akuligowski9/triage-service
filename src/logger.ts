/**
 * Shared Pino logger instance. Uses pino-pretty in development.
 */
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
    },
  }),
});

export default logger;
