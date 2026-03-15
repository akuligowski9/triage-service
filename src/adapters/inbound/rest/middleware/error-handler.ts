/**
 * Koa middleware that catches errors and returns structured JSON responses.
 * Handles Zod validation errors (400) and unexpected errors (500).
 */
import type { Context, Next } from 'koa';
import { ZodError } from 'zod';
import logger from '../../../../logger.js';

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    if (err instanceof ZodError) {
      ctx.status = 400;
      ctx.body = {
        error: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
      return;
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ err }, 'unhandled error');
    ctx.status = 500;
    ctx.body = { error: message };
  }
}
