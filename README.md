# Triage Service

A Node.js companion macroservice that ingests operational events from existing applications, triages them asynchronously using LangChain, and creates structured GitHub Issues.

Built as a companion to [project-bridge](https://github.com/akuligowski9/project-bridge) — an AI-powered skill-gap analysis tool. When project-bridge encounters errors or generates developer action items, it emits events to the triage service, which classifies them and proposes GitHub issues for review.

## Architecture

```
  DRIVING SIDE (input)              CORE                    DRIVEN SIDE (output)

  project-bridge ──POST──┐   ┌──────────────┐
  manual / Postman ───────┤──▶│  Koa API     │
                          │   │  (:4000)     │
                          │   └──────┬───────┘
                          │          │
                          │   ┌──────┴───────┐
                          │   │  Postgres    │
                          │   │  (events)    │
                          │   └──────┬───────┘
                          │          │
                          │   ┌──────┴───────┐
                          │   │  BullMQ      │       ┌─────────────────┐
                          │   │  Worker      │──────▶│  GitHub Issues  │
                          │   │  (LangChain) │       │  (Octokit)      │
                          │   └──────────────┘       └─────────────────┘
```

### Hexagonal Architecture (Ports & Adapters)

Every external dependency sits behind a port interface. The core domain has zero framework imports.

| Port                 | Adapter                    | Purpose                         |
|----------------------|----------------------------|---------------------------------|
| `EventStorePort`     | PostgresEventStore         | Persist intake events           |
| `TriageStorePort`    | PostgresTriageStore        | Persist AI triage results       |
| `TriageQueuePort`    | BullMQTriageQueue          | Async job processing            |
| `TriageEnginePort`   | LangChainTriageEngine      | AI-powered classification       |
| `IssueTrackerPort`   | GitHubIssueAdapter         | Create issues in GitHub         |

### Why this architecture?

- **Hexagonal / ports & adapters**: In a consultancy setting, client requirements change — databases swap, integrations rotate. Ports let the core absorb changes at the boundary.
- **Macroservice**: Single deployable with clear module boundaries. The worker could be extracted to a separate service if throughput required it — the queue already provides the decoupling boundary.
- **Node.js fit**: The workload is I/O-bound — HTTP intake, database writes, LLM API calls. The event loop handles high concurrency without threading overhead.
- **LangChain as an adapter**: Used for structured output parsing only (~40 lines). Sits behind `TriageEnginePort` — swappable for raw API calls or a rule-based engine.

## Tech Stack

| Layer            | Technology         |
|------------------|--------------------|
| API framework    | Koa 3              |
| Queue            | BullMQ + Redis     |
| Database         | PostgreSQL + Knex  |
| AI/LLM           | LangChain.js       |
| GitHub API       | Octokit            |
| Validation       | Zod                |
| Testing          | Vitest             |
| Language         | TypeScript (strict) |
| Containerization | Docker Compose     |

## Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/akuligowski9/triage-service.git
cd triage-service
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and GITHUB_TOKEN

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Run migrations
npm run migrate

# 5. Start the service
npm run dev
```

The dashboard is available at [http://localhost:4000/dashboard](http://localhost:4000/dashboard).

### API Endpoints

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| POST   | `/api/events`               | Submit an event for triage           |
| GET    | `/api/events`               | List events (filterable by status)   |
| GET    | `/api/events/:id`           | Get single event with triage result  |
| PATCH  | `/api/events/:id/triage`    | Edit triage result before approval   |
| POST   | `/api/events/:id/approve`   | Approve and create GitHub issue      |
| POST   | `/api/events/:id/dismiss`   | Dismiss an event                     |
| POST   | `/api/events/:id/retry`     | Retry a failed approval              |
| GET    | `/api/labels`               | Fetch GitHub repo labels             |
| GET    | `/api/health`               | Health check (API + Postgres + Redis)|

### Example: Submit an Event

```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "application_error",
    "project": "project-bridge",
    "message": "GitHub analyzer failed for private repo with malformed metadata",
    "stackTrace": "Traceback (most recent call last):\n  File orchestrator.py...",
    "metadata": { "stage": "github_analyzer" }
  }'
```

## Demo Flow

1. Trigger an error in project-bridge (or POST a sample event via curl)
2. The triage worker picks it up and classifies it with LangChain (OpenAI gpt-4o-mini)
3. Open the dashboard at `/dashboard` to see the triage queue
4. Review the AI-generated title, severity, labels, reproduction steps, and acceptance criteria
5. Optionally **edit** any field before approval
6. Click **Approve** to create a real GitHub issue on project-bridge
7. If approval fails (GitHub API error), the error is captured — click **Retry** to try again

## Testing

```bash
npm test           # Run all unit tests
```

11 tests across 4 files: unit tests covering the core use cases (ingest with idempotency, triage, approve — including error handling) with mock port implementations, plus 1 integration test with real Postgres and Redis. Proves the hexagonal architecture is testable without real infrastructure.

## Project Structure

```
src/
├── domain/          # Pure models + port interfaces (no framework imports)
├── application/     # Use cases (ingest, process, approve, list)
├── adapters/
│   ├── inbound/     # Koa REST routes + dashboard
│   └── outbound/    # Postgres, BullMQ, LangChain, GitHub adapters
├── worker/          # BullMQ triage worker
└── config/          # Env validation with Zod
```

## Observability

- **Request ID propagation**: Every request gets a correlation ID (from `X-Request-Id` header or generated). Stored in `AsyncLocalStorage`, automatically included in every Pino log line via mixin. Echoed back in the response.
- **Intake idempotency**: Duplicate events within the same hour are deduplicated via an idempotency key (caller-supplied or derived from the payload). Prevents duplicate business processing from network retries.

## Security

- **API key authentication**: Optional `API_KEY` env var. When set, all API requests must include `Authorization: Bearer <key>`. Health and dashboard routes are public.
- **Rate limiting**: `POST /api/events` is rate-limited to 30 requests/minute per IP to prevent BullMQ queue flooding. Returns 429 with standard rate limit headers.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` drain the HTTP server, worker, Redis, and Postgres connections before exit.
- **Global safety nets**: `unhandledRejection` and `uncaughtException` handlers log fatal errors and exit cleanly.

## Cross-Language Integration

The Python app (project-bridge) sends a fire-and-forget POST with a 3-second timeout:

```python
requests.post("http://localhost:4000/api/events", json=payload, timeout=3)
```

If the triage service is down, the error is silently skipped. Zero runtime coupling — the two services share an HTTP contract, not a language or framework.
