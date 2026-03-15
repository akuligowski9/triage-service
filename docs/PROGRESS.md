# Triage Service — Progress Log

---

## 2026-03-14 — Project Definition and Setup (Session 1)

### Context

Companion macroservice for project-bridge. Ingests operational events, triages with LangChain, and creates structured GitHub Issues. Built with hexagonal architecture to demonstrate clean separation of concerns.

### Decisions Made

- **Project concept**: Issue Intake & Triage Service — a companion Node.js macroservice that ingests operational events, triages them with LangChain, and creates GitHub Issues.
- **Architecture**: Hexagonal (ports & adapters), single deployable macroservice with clear module boundaries.
- **Tech stack**: Koa, BullMQ, Redis, Postgres, Knex, LangChain.js, Octokit, Zod, Vitest, TypeScript.
- **Integration target**: `akuligowski9/project-bridge` (existing Python project) emits events via fire-and-forget HTTP POST.
- **Output**: Real GitHub Issues on project-bridge repo.
- **LangChain scope**: One adapter (~40 lines), one chain, structured output only. Behind a port interface.
- **Three source types**: `application_error`, `validation_warning`, `developer_note`.
- **No Jira in v1**: Mock adapter moved to Parking Lot.
- **Dashboard**: Minimal static HTML queue view with approve button.

### Tech Spec

Full tech spec written and reviewed by both Claude and ChatGPT. Stored at `/Users/akuligowski/Code/MyDev/triage-service-tech-spec.md`.

### Project Setup

- Created repo directory and initialized git
- Created INSTRUCTIONS.md, BACKLOG.md, PROGRESS.md, CLAUDE.md
- 17 backlog items scoped (3 Critical, 7 High, 5 Medium, 2 Low)
- Created private GitHub repo at `akuligowski9/triage-service`

---

## 2026-03-14 — Full Pipeline Implementation (Session 1 cont., TRG-001 through TRG-015)

### Build Summary

Implemented the complete triage service pipeline in one session:

- **Scaffold** (TRG-001): Koa 3, TypeScript strict, Docker Compose with Postgres 16 + Redis 7, multi-stage Dockerfile
- **Database** (TRG-002): Knex migrations for `events` and `triage_results` tables
- **Domain** (TRG-003): 3 models + 4 port interfaces, zero framework imports
- **Intake** (TRG-004): `POST /api/events` with Zod validation, returns 202
- **Queue** (TRG-005): BullMQ with concurrency 3, exponential backoff, rate limiting
- **LangChain** (TRG-006): ~40 lines, `withStructuredOutput` + Zod schema, behind `TriageEnginePort`
- **Worker** (TRG-007): Connects queue → LangChain → Postgres, updates event status
- **Listing** (TRG-008): `GET /api/events` with status filtering and triage result join
- **GitHub** (TRG-009): Octokit adapter implementing `IssueTrackerPort`
- **Approve** (TRG-010): `POST /api/events/:id/approve`, validates status before creating issue
- **Dashboard** (TRG-011): Static HTML triage workbench with approve button, auto-refresh
- **Health** (TRG-013): Checks Postgres + Redis connectivity, returns 503 if down
- **Tests** (TRG-014): 8 unit tests across 3 use cases, all with mock ports
- **README** (TRG-015): Architecture diagram, setup guide, usage flow

### Issues Encountered

- Koa 2 incompatible with Node 22 (`is-generator-function` error) — upgraded to Koa 3
- Port 5433 already in use — switched Postgres to 5434
- Knex types use `string()` not `varchar()` — fixed in migrations

### Remaining

- TRG-016: Structured logging (Low)
- TRG-017: Integration test (Low)

---

## 2026-03-14 — Project-Bridge Integration (Session 1 cont., TRG-012)

### What was done

- Created `engine/projectbridge/triage_client.py` with `emit_triage_event()`, `emit_pipeline_error()`, and `emit_validation_warning()` convenience functions
- Hooked into 3 locations in `orchestrator.py`:
  - `github_analyzer` error path
  - `ai_context` error path
  - Unauthenticated GitHub access warning
- Fixed Zod `datetime()` validation in triage-service to accept Python's `+00:00` offset format (was rejecting non-Z timestamps)
- Verified end-to-end: Python client → Node service → stored in Postgres

### Files Modified

| File | Change |
|------|--------|
| `engine/projectbridge/triage_client.py` | New — fire-and-forget event emitter |
| `engine/projectbridge/orchestrator.py` | Added 3 triage event hooks |
| `src/adapters/inbound/rest/router.ts` | Fixed datetime validation for offset format |

---

## 2026-03-14 — Ollama LLM Swap (Session 2)

### What was done

- Swapped LangChain adapter from OpenAI (`ChatOpenAI`) to Ollama (`ChatOllama`) for zero-cost local inference
- Default model changed from `gpt-4o-mini` to `llama3` (8B, 4.7GB)
- Added `LLM_PROVIDER` env var (defaults to `ollama`, supports `openai` fallback)
- Worker now starts automatically with Ollama — no API key required
- All 9 tests pass, clean TypeScript compile

### Files Modified

| File | Change |
|------|--------|
| `src/adapters/outbound/langchain/triage-engine.adapter.ts` | `ChatOpenAI` → `ChatOllama`, default model `llama3` |
| `src/config/index.ts` | Added `LLM_PROVIDER` and `OLLAMA_BASE_URL` env vars |
| `src/index.ts` | Worker starts when `LLM_PROVIDER=ollama` (no API key needed) |
| `.env.example` | Updated with Ollama config, OpenAI commented out |

### Remaining

- End-to-end test with live inference
- Verify full pipeline with real GITHUB_TOKEN

---

## 2026-03-14 — OpenAI Swap, Dashboard Overhaul, and Codebase Cleanup (Session 3)

### Context

Swapped from Ollama to OpenAI for more reliable inference, built out the dashboard into a full triage workbench, and cleaned up codebase complexity.

### OpenAI Swap

- Removed Ollama support entirely (was dead code after swap)
- Removed `LlmProvider` type, `createModel()` factory, dynamic `import('@langchain/ollama')`
- Removed `OLLAMA_BASE_URL`, `LLM_PROVIDER`, and `ISSUE_TRACKER` config fields
- Uninstalled `@langchain/ollama` dependency (3 packages removed)
- Worker now starts when `OPENAI_API_KEY` is set (simple boolean check)
- Default model: `gpt-4o-mini` (low cost, fast)

### End-to-End Pipeline Verified

- POST event → OpenAI triage → approve → real GitHub issue created on `akuligowski9/project-bridge`
- Full cycle confirmed working with live API keys

### Dashboard Overhaul

Evolved from basic table to full triage workbench:

- **Filter panel** with dynamic dropdowns (status, source, severity, project)
- **Info tooltips** on Status/Source/Severity column headers explaining valid values
- **SVG icon buttons**: pencil (edit), checkmark (approve), X (dismiss), eye (view), retry (circular arrow)
- **Expandable review panel** showing labels, description, steps to reproduce, acceptance criteria, stack trace
- **Editable form** with label chips populated from GitHub repo labels via dropdown
- **Issue link** displayed for sent events
- **Error panel** for failed events showing service error details
- **Auto-refresh** every 10 seconds

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events/:id/triage` | PATCH | Edit triage result before approval |
| `/api/events/:id/dismiss` | POST | Dismiss an event |
| `/api/events/:id/retry` | POST | Reset failed event to triaged |
| `/api/labels` | GET | Fetch GitHub repo labels for edit form |

### New Domain Features

- **`acceptanceCriteria`** field on `TriageResult` — AI generates AC, editable before approval
- **`issueUrl`** field on `IntakeEvent` — tracks created GitHub issue URL
- **`errorMessage`** field on `IntakeEvent` — captures service error details
- **`dismissed`** status — manual removal of events
- **`failed`** status — set when GitHub API call fails during approval, with error message persisted

### Error Handling for Service Failures

- If GitHub issue creation fails, event moves to `failed` status with error message captured
- Dashboard shows red error panel with monospace error text
- Retry button resets event to `triaged` for re-approval
- New unit test verifies `setError` is called on GitHub failure

### Hexagonal Architecture Fix

- Created `TriageStorePort` interface (`src/domain/ports/triage-store.port.ts`)
- Updated `ListEvents`, `ProcessTriage`, `ApproveIssue` to depend on port, not concrete `PostgresTriageStore`
- `PostgresTriageStore` now implements `TriageStorePort`
- Domain layer is now fully decoupled — 5 ports, all with adapters

### Codebase Cleanup

- Added file-level doc comments to all 18 source files
- Removed all Ollama dead code and unused config
- Simplified `LangChainTriageEngine` constructor (no more async model factory)

### Database Migrations Added

| Migration | Change |
|-----------|--------|
| `20260314_003_add_acceptance_criteria.ts` | `acceptance_criteria` JSONB column on `triage_results` |
| `20260314_004_add_issue_url.ts` | `issue_url` column on `events` |
| `20260314_005_add_error_message.ts` | `error_message` TEXT column on `events` |

### Test Summary

- **10 tests** (was 8, added GitHub failure test + integration test)
- 3 unit test files: `ingest-event`, `process-triage`, `approve-issue` (4 tests)
- 1 integration test file: `event-flow`
- All passing, clean TypeScript compile

### Files Modified

| File | Change |
|------|--------|
| `src/config/index.ts` | Removed Ollama/LLM_PROVIDER/ISSUE_TRACKER config, added doc comment |
| `src/index.ts` | Simplified worker startup to OPENAI_API_KEY check, added doc comment |
| `src/adapters/outbound/langchain/triage-engine.adapter.ts` | Removed Ollama, simplified constructor, added doc comment |
| `src/domain/models/event.ts` | Added `issueUrl`, `errorMessage`, `dismissed` status, added doc comment |
| `src/domain/models/triage-result.ts` | Added `acceptanceCriteria`, added doc comment |
| `src/domain/models/issue.ts` | Added doc comment |
| `src/domain/ports/event-store.port.ts` | Added `setIssueUrl`, `setError`, added doc comment |
| `src/domain/ports/triage-store.port.ts` | **New** — port interface for triage store |
| `src/domain/ports/triage-engine.port.ts` | Added doc comment |
| `src/domain/ports/triage-queue.port.ts` | Added doc comment |
| `src/domain/ports/issue-tracker.port.ts` | Added doc comment |
| `src/application/ingest-event.ts` | Added doc comment |
| `src/application/list-events.ts` | Uses TriageStorePort, added doc comment |
| `src/application/process-triage.ts` | Uses TriageStorePort, added doc comment |
| `src/application/approve-issue.ts` | Uses TriageStorePort, error handling with setError, added doc comment |
| `src/adapters/outbound/postgres/event-store.adapter.ts` | Added `issueUrl`/`errorMessage` mapping, `setError()`, added doc comment |
| `src/adapters/outbound/postgres/triage-store.adapter.ts` | Implements TriageStorePort, `update()` for PATCH, added doc comment |
| `src/adapters/outbound/github/issue-tracker.adapter.ts` | Added `listLabels()`, added doc comment |
| `src/adapters/inbound/rest/router.ts` | Added PATCH/dismiss/retry/labels endpoints, added doc comment |
| `src/adapters/inbound/rest/middleware/error-handler.ts` | Added doc comment |
| `src/adapters/inbound/rest/middleware/request-logger.ts` | Added doc comment |
| `src/adapters/inbound/dashboard/public/index.html` | Full dashboard overhaul |
| `src/adapters/outbound/bullmq/triage-queue.adapter.ts` | Added doc comment |
| `src/worker/triage.worker.ts` | Added doc comment |
| `src/logger.ts` | Added doc comment |
| `package.json` | Removed `@langchain/ollama` dependency |
| `tests/unit/approve-issue.test.ts` | Added setError mock, GitHub failure test |
| `tests/unit/process-triage.test.ts` | Added setIssueUrl/setError mocks |
| `tests/unit/ingest-event.test.ts` | Added setIssueUrl/setError mocks |
| `tests/integration/event-flow.test.ts` | FK cleanup order, job state checks, new deps |

### Project-Bridge Integration Expanded

Added triage hooks to all remaining error paths in `orchestrator.py`:

| Stage | Type | What it catches |
|-------|------|-----------------|
| `github_analyzer` | `validation_warning` | No GitHub token (unauthenticated access) |
| `github_analyzer` | `application_error` | API failures, rate limits, bad usernames, timeouts |
| `resume_parser` | `application_error` | Malformed resume, parsing failures |
| `job_parser` | `application_error` | Invalid job description, parsing failures |
| `ai_context` | `application_error` | LLM provider errors, API timeouts |

Verified end-to-end: triggered `validation_warning` and `application_error` from project-bridge Python code → both received by triage service → triaged by OpenAI within seconds → visible in dashboard.

### Remaining

- Verify full pipeline works end-to-end with fresh database

---

## 2026-03-14 — Security Hardening and Production Readiness (Session 4)

### Context

Added production-grade security and resilience features: API key authentication, rate limiting on event intake, graceful shutdown, and global error safety nets.

### Node.js Production Hardening

- **Graceful shutdown**: `SIGTERM`/`SIGINT` handlers drain HTTP server, BullMQ worker, Redis, and Postgres connections before exiting
- **Global safety nets**: `unhandledRejection` and `uncaughtException` handlers log fatal errors and exit cleanly
- **Worker failure tracking**: Worker marks events as `failed` with error message after exhausting all BullMQ retries

### API Key Authentication (TRG-023)

- New Koa middleware at `src/adapters/inbound/rest/middleware/auth.ts`
- Validates `Authorization: Bearer <key>` header against `API_KEY` env var
- Public paths bypass auth: `/api/health`, `/dashboard`
- Opt-in — when `API_KEY` is unset, all requests pass through
- Middleware position: after CORS, before body parser (Koa onion model)

### Rate Limiting (TRG-024)

- `koa-ratelimit` applied as route-level middleware on `POST /api/events` only
- 30 requests per minute per IP (in-memory store)
- Returns 429 with `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset` headers
- Prevents BullMQ queue flooding from misbehaving clients

### Files Modified

| File | Change |
|------|--------|
| `src/index.ts` | Added auth middleware, graceful shutdown, unhandled rejection/exception handlers |
| `src/config/index.ts` | Added `API_KEY` env var |
| `src/adapters/inbound/rest/middleware/auth.ts` | **New** — API key auth middleware |
| `src/adapters/inbound/rest/router.ts` | Added `koa-ratelimit` on POST /api/events |
| `src/worker/triage.worker.ts` | Worker failure status updates via eventStore.setError() |
| `.env.example` | Added `API_KEY` comment |
| `package.json` | Added `koa-ratelimit`, `@types/koa-ratelimit` |

### Test Summary

- **10 tests** — all passing, clean TypeScript compile

---

## 2026-03-15 — Architecture Fixes, Fingerprinting, and Observability (Session 5)

### Architecture Fixes

- **`approved` status flow**: Events now transition `triaged → approved → sent/failed`. Previously `approved` was defined but never set.
- **Router port compliance**: Router depends on `TriageStorePort` and `IssueTrackerPort` instead of concrete `PostgresTriageStore` and `GitHubIssueAdapter`.
- **`listLabels()` on port**: Added to `IssueTrackerPort` so the labels endpoint uses the port boundary.
- **Removed `confidence`**: Dropped from domain model, LangChain schema, Postgres adapter, and migration.
- **`pino-pretty` to devDependencies**: No longer ships in production Docker image.

### Request ID Propagation (TRG-025)



- `AsyncLocalStorage` stores a per-request correlation ID
- Accepts `X-Request-Id` from upstream callers or generates one
- Pino `mixin()` automatically includes `requestId` in every log line within the request lifecycle
- Response header echoes `X-Request-Id` back to the caller

### Intake Idempotency (TRG-026)

- Caller can supply an `idempotencyKey`, or one is derived from `sourceType + project + message + hourBucket`
- Hour bucketing ensures legitimate repeat errors are still accepted, while network retries within the same hour are deduplicated
- Duplicate submissions return the existing event without re-enqueuing
- Separate concept from fingerprinting: idempotency prevents duplicate processing, fingerprints group failure types
- Unique constraint on `idempotency_key` column enforces at the database level

### Database Migrations Added

| Migration | Change |
|-----------|--------|
| `20260314_006_drop_confidence.ts` | Drop `confidence` column from `triage_results` |
| `20260315_008_add_idempotency_key.ts` | Add `idempotency_key` column + unique constraint to `events` |

### Files Modified

| File | Change |
|------|--------|
| `src/request-context.ts` | **New** — AsyncLocalStorage request context |
| `src/logger.ts` | Added Pino mixin for automatic requestId injection |
| `src/adapters/inbound/rest/middleware/request-logger.ts` | Request ID assignment + AsyncLocalStorage.run() |
| `src/domain/models/event.ts` | Added `fingerprint`, `idempotencyKey` fields |
| `src/domain/models/triage-result.ts` | Removed `confidence` field |
| `src/domain/ports/event-store.port.ts` | Added `findByIdempotencyKey()` |
| `src/domain/ports/issue-tracker.port.ts` | Added `listLabels()` |
| `src/application/ingest-event.ts` | Idempotency check + fingerprint generation |
| `src/application/approve-issue.ts` | `approved` status set before issue creation |
| `src/adapters/outbound/postgres/event-store.adapter.ts` | `fingerprint`, `idempotencyKey` mapping, `findByIdempotencyKey()` |
| `src/adapters/outbound/postgres/triage-store.adapter.ts` | Removed `confidence` |
| `src/adapters/outbound/langchain/triage-engine.adapter.ts` | Removed `confidence` from Zod schema |
| `src/adapters/inbound/rest/router.ts` | Uses port types, `idempotencyKey` in Zod schema, fingerprint in response |
| `src/adapters/inbound/dashboard/public/index.html` | `badge-approved` style, tooltip update |
| `src/index.ts` | Router uses `issueTracker` port, dummy includes `listLabels` |
| `package.json` | Moved `pino-pretty` to devDependencies |

### Test Summary

- **11 tests** across 4 files — all passing, clean TypeScript compile
- New: idempotency dedup test
