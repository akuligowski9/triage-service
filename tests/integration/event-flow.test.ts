import { describe, it, expect, afterEach, afterAll, beforeAll } from 'vitest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import http from 'http';
import knexInit from 'knex';
import { Queue } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { createRouter } from '../../src/adapters/inbound/rest/router.js';
import { errorHandler } from '../../src/adapters/inbound/rest/middleware/error-handler.js';
import { PostgresEventStore } from '../../src/adapters/outbound/postgres/event-store.adapter.js';
import { PostgresTriageStore } from '../../src/adapters/outbound/postgres/triage-store.adapter.js';
import { BullMQTriageQueue } from '../../src/adapters/outbound/bullmq/triage-queue.adapter.js';
import { IngestEvent } from '../../src/application/ingest-event.js';
import { ListEvents } from '../../src/application/list-events.js';
import { ApproveIssue } from '../../src/application/approve-issue.js';

const DATABASE_URL = 'postgres://triage:triage@localhost:5434/triage';
const REDIS_URL = 'redis://localhost:6380';

const db = knexInit({ client: 'pg', connection: DATABASE_URL });
const redis = new IORedis(REDIS_URL);

// BullMQ Queue instance to inspect jobs directly
const inspectionQueue = new Queue('triage-jobs', {
  connection: { host: 'localhost', port: 6380 },
});

// Adapters
const eventStore = new PostgresEventStore(db);
const triageStore = new PostgresTriageStore(db);
const triageQueue = new BullMQTriageQueue(REDIS_URL);

// Use cases
const ingestEvent = new IngestEvent(eventStore, triageQueue);
const listEvents = new ListEvents(eventStore, triageStore);
const approveIssue = new ApproveIssue(
  eventStore,
  triageStore,
  { createIssue: async () => { throw new Error('Not configured'); } },
  'test/repo',
);

// Koa app
const app = new Koa();
app.use(errorHandler);
app.use(bodyParser());
const router = createRouter({ ingestEvent, listEvents, approveIssue, db, redis });
app.use(router.routes());
app.use(router.allowedMethods());

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  // Run migrations so the events table exists
  await db.migrate.latest({
    directory: './src/adapters/outbound/postgres/migrations',
  });

  // Drain any leftover jobs from previous runs
  await inspectionQueue.drain();

  server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  // Clean up test data
  await db('events').del();
  await inspectionQueue.drain();
});

afterAll(async () => {
  server?.close();
  await inspectionQueue.close();
  await redis.quit();
  await db.destroy();
});

describe('Event intake integration flow', () => {
  it('POST /api/events returns 202 with id, persists to Postgres, and enqueues a BullMQ job', async () => {
    const payload = {
      sourceType: 'application_error',
      project: 'integration-test',
      environment: 'test',
      message: 'Null pointer in PaymentService.process()',
    };

    // 1. POST to the API
    const res = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 2. Verify 202 with an id
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.status).toBe('pending');
    expect(body.message).toBe('Event received and queued for triage');

    const eventId: string = body.id;

    // 3. Verify the event exists in Postgres
    const row = await db('events').where({ id: eventId }).first();
    expect(row).toBeDefined();
    expect(row.source_type).toBe('application_error');
    expect(row.project).toBe('integration-test');
    expect(row.environment).toBe('test');
    expect(row.message).toBe('Null pointer in PaymentService.process()');
    expect(row.status).toBe('pending');

    // 4. Verify a BullMQ job was created
    const waiting = await inspectionQueue.getWaiting();
    const job = waiting.find((j) => j.data.eventId === eventId);
    expect(job).toBeDefined();
    expect(job!.data.eventId).toBe(eventId);
  });
});
