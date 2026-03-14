import Router from '@koa/router';
import { z } from 'zod';
import type { IngestEvent } from '../../../application/ingest-event.js';
import type { ListEvents } from '../../../application/list-events.js';
import type { ApproveIssue } from '../../../application/approve-issue.js';
import type { EventStatus } from '../../../domain/models/event.js';
import type { Knex } from 'knex';
import type { Redis } from 'ioredis';

const eventInputSchema = z.object({
  sourceType: z.enum(['application_error', 'validation_warning', 'developer_note']),
  project: z.string().min(1),
  environment: z.string().optional(),
  message: z.string().min(1),
  stackTrace: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export function createRouter(deps: {
  ingestEvent: IngestEvent;
  listEvents: ListEvents;
  approveIssue: ApproveIssue;
  db: Knex;
  redis: Redis;
}): Router {
  const router = new Router({ prefix: '/api' });

  // Health
  router.get('/health', async (ctx) => {
    let pgStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await deps.db.raw('SELECT 1');
    } catch {
      pgStatus = 'down';
    }

    try {
      await deps.redis.ping();
    } catch {
      redisStatus = 'down';
    }

    const allOk = pgStatus === 'ok' && redisStatus === 'ok';
    ctx.status = allOk ? 200 : 503;
    ctx.body = { api: 'ok', postgres: pgStatus, redis: redisStatus };
  });

  // Event intake
  router.post('/events', async (ctx) => {
    const input = eventInputSchema.parse(ctx.request.body);
    const event = await deps.ingestEvent.execute(input);

    ctx.status = 202;
    ctx.body = {
      id: event.id,
      status: event.status,
      message: 'Event received and queued for triage',
    };
  });

  // List events
  router.get('/events', async (ctx) => {
    const status = ctx.query.status as EventStatus | undefined;
    const events = await deps.listEvents.execute(status);
    ctx.body = events;
  });

  // Get single event
  router.get('/events/:id', async (ctx) => {
    const event = await deps.listEvents.findById(ctx.params.id);
    if (!event) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found' };
      return;
    }
    ctx.body = event;
  });

  // Approve event → create GitHub issue
  router.post('/events/:id/approve', async (ctx) => {
    try {
      const result = await deps.approveIssue.execute(ctx.params.id);
      ctx.body = { issueUrl: result.url, issueNumber: result.number };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      if (message.includes('not found') || message.includes('Cannot approve')) {
        ctx.status = 400;
        ctx.body = { error: message };
        return;
      }
      throw err;
    }
  });

  return router;
}
