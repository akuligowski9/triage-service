# Triage Service Backlog

**Prefix:** TRG
**Status Flow:** `Planned --> In Progress --> Done | Blocked | Archived`
**Timeline:** Weekend build (2026-03-14 to 2026-03-16), interview Monday 2026-03-17

---

## Critical

### TRG-001: Project Scaffold

#### Description

Initialize the TypeScript project with Koa, Docker Compose, and all core dependencies. Set up `tsconfig.json`, `package.json`, `.env.example`, `Dockerfile`, and `docker-compose.yml` with Postgres and Redis services. This is the foundation — nothing else can start until this works.

#### Acceptance Criteria

- [ ] `package.json` with all dependencies from tech spec
- [ ] `tsconfig.json` configured for ESM + strict mode
- [ ] `Dockerfile` with multi-stage build
- [ ] `docker-compose.yml` with triage-service, postgres, redis (with healthchecks)
- [ ] `.env.example` with all required env vars documented
- [ ] `.gitignore` for node_modules, dist, .env, etc.
- [ ] `npm run dev` starts the app with tsx
- [ ] `docker compose up` starts all services

#### Metadata

- **Status:** Done
- **Priority:** Critical
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-002: Database Migrations

#### Description

Set up Knex.js with migration support and create the two core tables: `events` and `triage_results`. Events store raw intake data with status tracking. Triage results store the LangChain-generated structured output linked to events. Indexes on `status` and `project` for dashboard queries.

#### Acceptance Criteria

- [ ] `knexfile.ts` configured for Postgres connection via `DATABASE_URL`
- [ ] Migration `001_create_events` creates events table with all fields from tech spec
- [ ] Migration `002_create_triage_results` creates triage_results table with FK to events
- [ ] Indexes on `events.status` and `events.project`
- [ ] `npm run migrate` runs migrations successfully
- [ ] Migrations are idempotent (can run multiple times safely)

#### Metadata

- **Status:** Done
- **Priority:** Critical
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-003: Domain Models and Port Interfaces

#### Description

Define the core domain types and port interfaces that the entire application depends on. This is the hexagonal architecture foundation — pure TypeScript interfaces with no framework imports. Models: `IntakeEvent`, `TriageResult`, `Issue`. Ports: `EventStorePort`, `TriageQueuePort`, `TriageEnginePort`, `IssueTrackerPort`.

#### Acceptance Criteria

- [ ] `src/domain/models/event.ts` — IntakeEvent interface with EventSourceType and EventStatus enums
- [ ] `src/domain/models/triage-result.ts` — TriageResult interface
- [ ] `src/domain/models/issue.ts` — Issue interface
- [ ] `src/domain/ports/event-store.port.ts` — EventStorePort interface
- [ ] `src/domain/ports/triage-queue.port.ts` — TriageQueuePort interface
- [ ] `src/domain/ports/triage-engine.port.ts` — TriageEnginePort interface
- [ ] `src/domain/ports/issue-tracker.port.ts` — IssueTrackerPort interface
- [ ] No framework imports in domain layer — pure TypeScript only

#### Metadata

- **Status:** Done
- **Priority:** Critical
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## High

### TRG-004: Event Intake Endpoint

#### Description

Build the `POST /api/events` endpoint that validates incoming events with Zod, stores them in Postgres via the EventStorePort, enqueues a triage job via the TriageQueuePort, and returns 202 Accepted. This is the entry point for the entire pipeline. Accepts three source types: `application_error`, `validation_warning`, `developer_note`.

#### Acceptance Criteria

- [ ] `POST /api/events` accepts JSON body matching IntakeEvent schema
- [ ] Zod validation rejects malformed payloads with 400 + clear error message
- [ ] Valid events stored in Postgres with status `pending`
- [ ] BullMQ job enqueued with `eventId` payload
- [ ] Returns 202 with `{ id, status, message }`
- [ ] Koa error-handling middleware catches and formats errors

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-005: BullMQ Queue and Worker Scaffold

#### Description

Set up BullMQ with Redis connection, create the `triage-jobs` queue, and build the worker scaffold. The worker should pick up jobs, fetch the event from Postgres, and (initially) log the event — the actual LangChain call comes in TRG-006. Configure retry strategy with exponential backoff (3 attempts), concurrency, and rate limiting for LLM calls.

#### Acceptance Criteria

- [ ] BullMQ queue `triage-jobs` created with Redis connection
- [ ] Worker processes jobs with concurrency of 3
- [ ] Rate limiter configured (max 10 jobs per 60 seconds)
- [ ] Exponential backoff retry (3 attempts, 2s base delay)
- [ ] Worker fetches event from Postgres by eventId
- [ ] Failed jobs update event status to `failed`
- [ ] Worker logs job processing for debugging

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-006: LangChain Triage Engine Adapter

#### Description

Implement the `TriageEnginePort` using LangChain.js. Uses `ChatPromptTemplate` for the system/human prompt pair and `withStructuredOutput` with a Zod schema to get validated structured output from the LLM. This is the only place LangChain is used in the entire project — ~40-50 lines behind a port interface.

#### Acceptance Criteria

- [ ] `LangChainTriageEngine` class implements `TriageEnginePort`
- [ ] Uses `ChatPromptTemplate.fromMessages` with system + human prompts
- [ ] Uses `withStructuredOutput` with Zod schema for validated output
- [ ] Returns `TriageResult` with issueType, severity, title, body, labels, confidence
- [ ] Configurable model name (defaults to `gpt-4o-mini`)
- [ ] Handles LLM errors gracefully (throws, caught by worker retry)

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-007: Worker Triage Processing

#### Description

Connect the worker (TRG-005) to the LangChain triage engine (TRG-006). When a job is picked up, the worker fetches the event, passes it to the triage engine, stores the TriageResult in Postgres, and updates the event status to `triaged`. This completes the async processing pipeline.

#### Acceptance Criteria

- [ ] Worker calls `TriageEnginePort.triage()` with the fetched event
- [ ] TriageResult stored in `triage_results` table
- [ ] Event status updated to `triaged` on success
- [ ] Event status updated to `failed` on final failure (after retries)
- [ ] End-to-end: POST event → worker processes → result in Postgres

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-008: Event Listing Endpoint

#### Description

Build the `GET /api/events` endpoint that returns events with their triage results for the dashboard. Support filtering by status query parameter. Join events with triage_results so the dashboard gets everything in one call.

#### Acceptance Criteria

- [ ] `GET /api/events` returns array of events with nested triage results
- [ ] Filterable by `?status=pending|triaged|approved|sent|failed`
- [ ] Returns most recent events first (ordered by `received_at` DESC)
- [ ] `GET /api/events/:id` returns single event with triage result

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-009: GitHub Issues Adapter

#### Description

Implement the `IssueTrackerPort` using Octokit to create real GitHub Issues. Takes a structured Issue (title, body, labels) and creates it on the configured target repository (`akuligowski9/project-bridge`). This is the real output — issues created by the demo show up on the actual project.

#### Acceptance Criteria

- [ ] `GitHubIssueAdapter` class implements `IssueTrackerPort`
- [ ] Uses Octokit with `GITHUB_TOKEN` authentication
- [ ] Creates issue on `TARGET_REPO` with title, body, and labels
- [ ] Returns `{ url, number }` of created issue
- [ ] Handles API errors (auth failure, rate limit, repo not found)

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-010: Approve Endpoint

#### Description

Build the `POST /api/events/:id/approve` endpoint that takes a triaged event, constructs an Issue from the TriageResult, sends it to the configured IssueTrackerPort, and updates the event status to `sent`. This is the human-in-the-loop step — the user reviews the AI triage and approves before an issue is created.

#### Acceptance Criteria

- [ ] `POST /api/events/:id/approve` creates a GitHub issue from the triage result
- [ ] Only works on events with status `triaged` (rejects others with 400)
- [ ] Updates event status to `sent` on success
- [ ] Returns `{ issueUrl, issueNumber }` in response
- [ ] Handles issue tracker errors gracefully

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## Medium

### TRG-011: Triage Dashboard

#### Description

Build a minimal static HTML dashboard served by Koa at `/dashboard`. Shows the triage queue as a table with event details, triage results, and an approve button. No frontend framework — vanilla HTML/JS/CSS. The dashboard is the "front-end" of the system but it is not what's being evaluated.

#### Acceptance Criteria

- [ ] Static HTML page served at `GET /dashboard`
- [ ] Table showing events: status, source type, project, message, severity, confidence
- [ ] Triaged events show suggested title and labels
- [ ] Approve button that calls `POST /api/events/:id/approve`
- [ ] Visual status indicators (pending, triaged, sent, failed)
- [ ] Auto-refresh or manual refresh button

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-012: Project-Bridge Integration

#### Description

Add `triage_client.py` to project-bridge that emits events to the triage service when pipeline errors occur. Wire 2-3 `PipelineError` catch blocks in `orchestrator.py` to call `emit_triage_event()`. Fire-and-forget with 3-second timeout — zero coupling. This makes the demo real: trigger an error in project-bridge, see it flow through the triage service, approve it, see the GitHub issue.

#### Acceptance Criteria

- [ ] `engine/projectbridge/triage_client.py` with `emit_triage_event()` function
- [ ] Fire-and-forget POST with 3-second timeout
- [ ] Silent failure if triage service is unavailable
- [ ] Hooked into 2-3 except blocks in `orchestrator.py`
- [ ] End-to-end: error in project-bridge → event in triage dashboard

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No
- **Session Notes:** Fixed Zod datetime validation to accept Python's +00:00 offset format. Hooked into github_analyzer, ai_context, and validation warning paths.

---

### TRG-013: Health Endpoint

#### Description

Build a `GET /api/health` endpoint that checks Postgres and Redis connectivity. Returns status for each dependency. Useful for Docker healthcheck and demo credibility.

#### Acceptance Criteria

- [ ] `GET /api/health` returns `{ api: "ok", redis: "ok"|"down", postgres: "ok"|"down" }`
- [ ] Returns 200 if all healthy, 503 if any dependency is down
- [ ] Used as Docker healthcheck for triage-service container

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-014: Unit Tests

#### Description

Write unit tests for the three core use cases using mock port implementations. Tests prove that the hexagonal architecture works — use cases are testable without real databases, queues, or LLM calls. Target: 5-8 tests.

#### Acceptance Criteria

- [ ] `tests/unit/ingest-event.test.ts` — stores event, enqueues job, rejects invalid input
- [ ] `tests/unit/process-triage.test.ts` — calls triage engine, stores result, updates status
- [ ] `tests/unit/approve-issue.test.ts` — creates issue via tracker, updates status, rejects non-triaged
- [ ] All tests pass with `npm test`
- [ ] Tests use mock port implementations (no real infra)

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-015: README with Architecture Docs

#### Description

Write a README that explains the project, architecture decisions, setup instructions, and demo flow. Include the ASCII architecture diagram from the tech spec. This is what the interviewer will see first on GitHub.

#### Acceptance Criteria

- [ ] Project overview and motivation
- [ ] Architecture diagram (ASCII or Mermaid)
- [ ] Tech stack table with rationale
- [ ] Setup instructions (Docker Compose)
- [ ] Demo walkthrough steps
- [ ] Architectural decisions section (why hexagonal, why macroservice, why Koa)

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## Low

### TRG-016: Structured Logging

#### Description

Add pino logger throughout the application for structured JSON logging. Log at intake, queue, worker, and output boundaries. Helps with demo observability and shows production thinking.

#### Acceptance Criteria

- [ ] Pino logger configured with pretty-print in development
- [ ] Request logging middleware for Koa
- [ ] Worker logs job start, triage result, and completion
- [ ] Adapter logs for GitHub issue creation

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Enhancement
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-017: Integration Test

#### Description

One integration test that exercises the full flow: POST an event, verify it's stored in Postgres, verify BullMQ job is created. Requires real Redis and Postgres (via Docker Compose test profile or testcontainers).

#### Acceptance Criteria

- [ ] POST event → verify row in events table → verify BullMQ job exists
- [ ] Runs against real Redis + Postgres
- [ ] Can be run with `npm run test:integration`

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## Parking Lot

- **Mock Jira Adapter** — Console-log implementation of IssueTrackerPort. Proves architecture but adds no demo value. Build only if Critical–Medium items are done early.
- **Reject Endpoint** — `POST /api/events/:id/reject` to dismiss events. Not needed for demo flow.
- **Retry Endpoint** — `POST /api/events/:id/retry` to re-queue failed events. Not needed for demo flow.
- **Config Validation** — Zod schema for env vars in `src/config/index.ts`. Nice for production, not critical for demo.

---

## Documented Gaps

- **No authentication** — API is open. Acceptable for interview demo, would add JWT/API key auth in production.
- **No deduplication** — Same error can create multiple events. Noted as future enhancement.
- **No pagination** — `GET /api/events` returns all events. Fine for demo scale.
- **Single LLM provider** — Only OpenAI via LangChain. Architecture supports swapping but only one implemented.

---

## Done

- **TRG-001**: Project Scaffold
- **TRG-002**: Database Migrations
- **TRG-003**: Domain Models and Port Interfaces
- **TRG-004**: Event Intake Endpoint
- **TRG-005**: BullMQ Queue and Worker Scaffold
- **TRG-006**: LangChain Triage Engine Adapter
- **TRG-007**: Worker Triage Processing
- **TRG-008**: Event Listing Endpoint
- **TRG-009**: GitHub Issues Adapter
- **TRG-010**: Approve Endpoint
- **TRG-011**: Triage Dashboard
- **TRG-013**: Health Endpoint
- **TRG-014**: Unit Tests
- **TRG-012**: Project-Bridge Integration
- **TRG-015**: README with Architecture Docs
