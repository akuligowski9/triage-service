/**
 * Koa middleware that assigns a request ID (from X-Request-Id header or
 * generated), stores it in AsyncLocalStorage for automatic log correlation,
 * and echoes it back in the response header.
 */
import { randomUUID } from 'crypto';
import type { Context, Next } from 'koa';
import logger from '../../../../logger.js';
import { requestContext } from '../../../../request-context.js';

export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const requestId = ctx.get('X-Request-Id') || randomUUID();
  ctx.set('X-Request-Id', requestId);

  const start = Date.now();

  await requestContext.run({ requestId }, async () => {
    await next();

    const duration = Date.now() - start;
    logger.info(
      { method: ctx.method, path: ctx.path, status: ctx.status, duration },
      `${ctx.method} ${ctx.path} ${ctx.status} ${duration}ms`,
    );
  });
}
