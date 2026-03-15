/**
 * Koa middleware that validates API key authentication via the Authorization header.
 * Skips auth for health checks and the dashboard. If no API_KEY is configured, all requests pass through.
 */
import type { Context, Next } from 'koa';

const PUBLIC_PATHS = ['/api/health', '/dashboard'];

export function createAuthMiddleware(apiKey?: string) {
  return async (ctx: Context, next: Next): Promise<void> => {
    if (!apiKey || PUBLIC_PATHS.some((p) => ctx.path.startsWith(p))) {
      return next();
    }

    const header = ctx.get('Authorization');
    if (header !== `Bearer ${apiKey}`) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid or missing API key' };
      return;
    }

    return next();
  };
}
