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

| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| POST   | `/api/events`               | Submit an event for triage         |
| GET    | `/api/events`               | List events (filterable by status) |
| GET    | `/api/events/:id`           | Get single event with triage result|
| POST   | `/api/events/:id/approve`   | Approve and create GitHub issue    |
| GET    | `/api/health`               | Health check (API + Postgres + Redis) |

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
2. The triage worker picks it up and classifies it with LangChain
3. Open the dashboard at `/dashboard` to see the triage queue
4. Review the AI-generated issue title, severity, and labels
5. Click **Approve** to create a real GitHub issue on project-bridge

## Testing

```bash
npm test           # Run all unit tests
```

8 unit tests covering the three core use cases (ingest, triage, approve) with mock port implementations — proving the hexagonal architecture is testable without real infrastructure.

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

## Cross-Language Integration

The Python app (project-bridge) sends a fire-and-forget POST with a 3-second timeout:

```python
requests.post("http://localhost:4000/api/events", json=payload, timeout=3)
```

If the triage service is down, the error is silently skipped. Zero runtime coupling — the two services share an HTTP contract, not a language or framework.
