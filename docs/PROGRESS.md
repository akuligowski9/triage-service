# Triage Service — Progress Log

---

## 2026-03-14 — Project Definition and Setup (Session 1)

### Context

Interview project for Globant Node.js seniority evaluation on Monday 2026-03-17. Interviewer asked to build something with GenAI, mentioned LangChain, and will walk through the code to assess architectural understanding.

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
- **README** (TRG-015): Architecture diagram, setup guide, demo flow

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
