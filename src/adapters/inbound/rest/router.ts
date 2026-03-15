/**
 * REST API router. Defines all /api endpoints for event intake,
 * listing, triage editing, dismissal, and GitHub issue approval.
 */
import Router from '@koa/router';
import { z } from 'zod';
import ratelimit from 'koa-ratelimit';
import type { IngestEvent } from '../../../application/ingest-event.js';
import type { ListEvents } from '../../../application/list-events.js';
import type { ApproveIssue } from '../../../application/approve-issue.js';
import type { EventStatus } from '../../../domain/models/event.js';
import type { EventStorePort } from '../../../domain/ports/event-store.port.js';
import type { TriageStorePort } from '../../../domain/ports/triage-store.port.js';
import type { IssueTrackerPort } from '../../../domain/ports/issue-tracker.port.js';
import type { Knex } from 'knex';
import type { Redis } from 'ioredis';

const triageUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  labels: z.array(z.string()).optional(),
  reproductionSteps: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});

const eventInputSchema = z.object({
  sourceType: z.enum(['application_error', 'validation_warning', 'developer_note']),
  project: z.string().min(1),
  environment: z.string().optional(),
  message: z.string().min(1),
  stackTrace: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export function createRouter(deps: {
  ingestEvent: IngestEvent;
  listEvents: ListEvents;
  approveIssue: ApproveIssue;
  eventStore: EventStorePort;
  triageStore: TriageStorePort;
  issueTracker: IssueTrackerPort | null;
  targetRepo: string;
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

  // Labels from issue tracker
  router.get('/labels', async (ctx) => {
    if (!deps.issueTracker) {
      ctx.body = [];
      return;
    }
    const labels = await deps.issueTracker.listLabels(deps.targetRepo);
    ctx.body = labels;
  });

  // Rate limiter — prevent queue flooding on event intake
  const ingestLimiter = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60_000,       // 1-minute window
    max: 30,                // 30 requests per window per IP
    id: (ctx) => ctx.ip,
    errorMessage: 'Rate limit exceeded — try again shortly',
    headers: {
      remaining: 'X-RateLimit-Remaining',
      total: 'X-RateLimit-Limit',
      reset: 'X-RateLimit-Reset',
    },
  });

  // Event intake
  router.post('/events', ingestLimiter, async (ctx) => {
    const input = eventInputSchema.parse(ctx.request.body);
    const event = await deps.ingestEvent.execute(input);

    ctx.status = 202;
    ctx.body = {
      id: event.id,
      fingerprint: event.fingerprint,
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

  // Update triage result
  router.patch('/events/:id/triage', async (ctx) => {
    const event = await deps.listEvents.findById(ctx.params.id);
    if (!event) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found' };
      return;
    }
    if (event.status !== 'triaged') {
      ctx.status = 400;
      ctx.body = { error: 'Can only edit triaged events' };
      return;
    }
    const fields = triageUpdateSchema.parse(ctx.request.body);
    await deps.triageStore.update(ctx.params.id, fields);
    ctx.body = { id: ctx.params.id, status: 'updated' };
  });

  // Dismiss event
  router.post('/events/:id/dismiss', async (ctx) => {
    const event = await deps.listEvents.findById(ctx.params.id);
    if (!event) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found' };
      return;
    }
    if (event.status === 'sent') {
      ctx.status = 400;
      ctx.body = { error: 'Cannot dismiss an event that was already sent' };
      return;
    }
    await deps.eventStore.updateStatus(ctx.params.id, 'dismissed');
    ctx.body = { id: ctx.params.id, status: 'dismissed' };
  });

  // Retry failed event → reset to triaged
  router.post('/events/:id/retry', async (ctx) => {
    const event = await deps.listEvents.findById(ctx.params.id);
    if (!event) {
      ctx.status = 404;
      ctx.body = { error: 'Event not found' };
      return;
    }
    if (event.status !== 'failed') {
      ctx.status = 400;
      ctx.body = { error: 'Can only retry failed events' };
      return;
    }
    await deps.eventStore.updateStatus(ctx.params.id, 'triaged');
    ctx.body = { id: ctx.params.id, status: 'triaged' };
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
