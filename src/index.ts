import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import knex from 'knex';
import { loadConfig } from './config/index.js';
import { PostgresEventStore } from './adapters/outbound/postgres/event-store.adapter.js';
import { PostgresTriageStore } from './adapters/outbound/postgres/triage-store.adapter.js';
import { BullMQTriageQueue } from './adapters/outbound/bullmq/triage-queue.adapter.js';
import { IngestEvent } from './application/ingest-event.js';
import { ListEvents } from './application/list-events.js';
import { createRouter } from './adapters/inbound/rest/router.js';
import { errorHandler } from './adapters/inbound/rest/middleware/error-handler.js';
import { LangChainTriageEngine } from './adapters/outbound/langchain/triage-engine.adapter.js';
import { ProcessTriage } from './application/process-triage.js';
import { createTriageWorker } from './worker/triage.worker.js';
import { GitHubIssueAdapter } from './adapters/outbound/github/issue-tracker.adapter.js';
import { ApproveIssue } from './application/approve-issue.js';

const config = loadConfig();

// Infrastructure
const db = knex({
  client: 'pg',
  connection: config.DATABASE_URL,
});

// Adapters
const eventStore = new PostgresEventStore(db);
const triageStore = new PostgresTriageStore(db);
const triageQueue = new BullMQTriageQueue(config.REDIS_URL);

// Issue tracker
const issueTracker = config.GITHUB_TOKEN
  ? new GitHubIssueAdapter(config.GITHUB_TOKEN)
  : null;

// Use cases
const ingestEvent = new IngestEvent(eventStore, triageQueue);
const listEvents = new ListEvents(eventStore, triageStore);
const approveIssue = new ApproveIssue(
  eventStore,
  triageStore,
  issueTracker ?? { createIssue: async () => { throw new Error('GITHUB_TOKEN not configured'); } },
  config.TARGET_REPO,
);

// Worker (only starts if OPENAI_API_KEY is set)
if (config.OPENAI_API_KEY) {
  const triageEngine = new LangChainTriageEngine();
  const processTriage = new ProcessTriage(eventStore, triageEngine, triageStore);
  createTriageWorker(config.REDIS_URL, processTriage);
  console.log('triage worker started');
} else {
  console.warn('OPENAI_API_KEY not set — triage worker disabled');
}

// App
const app = new Koa();
app.use(errorHandler);
app.use(cors());
app.use(bodyParser());

const router = createRouter({ ingestEvent, listEvents, approveIssue });
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(config.PORT, () => {
  console.log(`triage-service listening on :${config.PORT}`);
});
