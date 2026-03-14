import type { Context, Next } from 'koa';
import logger from '../../../../logger.js';

export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  logger.info(
    { method: ctx.method, path: ctx.path, status: ctx.status, duration },
    `${ctx.method} ${ctx.path} ${ctx.status} ${duration}ms`,
  );
}
