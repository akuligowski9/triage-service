# Triage Service Backlog

**Prefix:** TRG
**Status Flow:** `Planned --> In Progress --> Done | Blocked | Archived`
**Started:** 2026-03-14

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

Implement the `IssueTrackerPort` using Octokit to create real GitHub Issues. Takes a structured Issue (title, body, labels) and creates it on the configured target repository (`akuligowski9/project-bridge`).

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

Add `triage_client.py` to project-bridge that emits events to the triage service when pipeline errors occur. Wire 2-3 `PipelineError` catch blocks in `orchestrator.py` to call `emit_triage_event()`. Fire-and-forget with 3-second timeout — zero coupling.

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
- **Session Notes:** Fixed Zod datetime validation to accept Python's +00:00 offset format. Hooked into all 5 error paths: github_analyzer (error + warning), resume_parser, job_parser, ai_context.

---

### TRG-013: Health Endpoint

#### Description

Build a `GET /api/health` endpoint that checks Postgres and Redis connectivity. Returns status for each dependency. Used as Docker healthcheck.

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

Write a README that explains the project, architecture decisions, setup instructions, and usage flow. Include the ASCII architecture diagram.

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

Add pino logger throughout the application for structured JSON logging. Log at intake, queue, worker, and output boundaries for observability.

#### Acceptance Criteria

- [ ] Pino logger configured with pretty-print in development
- [ ] Request logging middleware for Koa
- [ ] Worker logs job start, triage result, and completion
- [ ] Adapter logs for GitHub issue creation

#### Metadata

- **Status:** Done
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

- **Status:** Done
- **Priority:** Low
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-018: Dashboard Triage Workbench

#### Description

Extend the static HTML dashboard from a basic table into a full triage workbench. Add filter panel, expandable review/edit panels, icon-based actions (edit, approve, dismiss, view), label management from GitHub, and auto-refresh. Enables human-in-the-loop review workflow.

#### Acceptance Criteria

- [ ] Filter panel with dynamic dropdowns for status, source, severity, project
- [ ] Info tooltips on column headers explaining valid values
- [ ] SVG icon buttons for edit, approve, dismiss, and view actions
- [ ] Expandable review panel with labels, description, STR, AC, stack trace
- [ ] Editable form with label chips from GitHub repo labels dropdown
- [ ] Issue link displayed for sent events
- [ ] Auto-refresh every 10 seconds

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Enhancement
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-019: Triage Result Editing

#### Description

Allow human reviewers to edit AI-generated triage results before approving. Add PATCH endpoint for partial updates to title, description, severity, labels, reproduction steps, and acceptance criteria. Enables human-in-the-loop quality control.

#### Acceptance Criteria

- [ ] `PATCH /api/events/:id/triage` updates triage result fields
- [ ] Zod validation on update payload
- [ ] Only triaged events can be edited (400 otherwise)
- [ ] Dashboard edit form with save/cancel actions

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-020: Dismiss and Retry Endpoints

#### Description

Add endpoints for dismissing events and retrying failed approvals. Dismiss removes events from the active queue. Retry resets failed events back to triaged status for re-approval. Completes the event lifecycle management.

#### Acceptance Criteria

- [ ] `POST /api/events/:id/dismiss` sets status to dismissed
- [ ] Cannot dismiss already-sent events
- [ ] `POST /api/events/:id/retry` resets failed events to triaged
- [ ] Cannot retry non-failed events

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-021: Service Error Handling

#### Description

Capture and surface errors from external service calls (GitHub API). When approval fails, persist the error message on the event with `failed` status. Dashboard shows error details with a retry option.

#### Acceptance Criteria

- [ ] GitHub API errors caught in approve flow, error message persisted
- [ ] Event status set to `failed` with `error_message` column populated
- [ ] Dashboard shows error panel for failed events
- [ ] Retry button resets to triaged
- [ ] Unit test verifies error capture behavior

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-022: Hexagonal Architecture Cleanup

#### Description

Create missing `TriageStorePort` interface to fix hexagonal architecture gap where use cases imported the concrete `PostgresTriageStore` class. Remove dead code, unused config, and add file-level doc comments.

#### Acceptance Criteria

- [ ] `TriageStorePort` interface created in domain layer
- [ ] All use cases depend on port, not concrete adapter
- [ ] Ollama code removed (config, adapter, dependency)
- [ ] Unused `ISSUE_TRACKER` config removed
- [ ] File-level doc comments on all 18 source files

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Maintenance
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-023: API Key Authentication Middleware

#### Description

Add optional API key authentication via Koa middleware. Uses `Authorization: Bearer <key>` header. Skips auth for health and dashboard routes. When `API_KEY` env var is unset, API remains open.

#### Acceptance Criteria

- [ ] Koa middleware validates `Authorization: Bearer <key>` header
- [ ] Health (`/api/health`) and dashboard (`/dashboard`) bypass auth
- [ ] Returns 401 with clear error message on invalid/missing key
- [ ] When `API_KEY` is unset, all requests pass through (opt-in security)
- [ ] Configured via `API_KEY` env var in `.env`

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### TRG-024: Rate Limiting on Event Intake

#### Description

Add rate limiting to `POST /api/events` to prevent BullMQ queue flooding. Uses `koa-ratelimit` with in-memory store, scoped per IP. Returns 429 with rate limit headers when exceeded.

#### Acceptance Criteria

- [ ] Rate limiter applied to `POST /api/events` only
- [ ] 30 requests per minute per IP
- [ ] Returns `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset` headers
- [ ] Returns 429 with error message when exceeded

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## Parking Lot

- **Mock Jira Adapter** — Console-log implementation of IssueTrackerPort. Architecture supports it via the port interface.

---

## Documented Gaps

- **No deduplication** — Same error can create multiple events. Future enhancement.
- **No pagination** — `GET /api/events` returns all events. Would add cursor-based pagination at scale.

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
- **TRG-012**: Project-Bridge Integration
- **TRG-013**: Health Endpoint
- **TRG-014**: Unit Tests
- **TRG-015**: README with Architecture Docs
- **TRG-016**: Structured Logging
- **TRG-017**: Integration Test
- **TRG-018**: Dashboard Triage Workbench
- **TRG-019**: Triage Result Editing
- **TRG-020**: Dismiss and Retry Endpoints
- **TRG-021**: Service Error Handling
- **TRG-022**: Hexagonal Architecture Cleanup
- **TRG-023**: API Key Authentication Middleware
- **TRG-024**: Rate Limiting on Event Intake
