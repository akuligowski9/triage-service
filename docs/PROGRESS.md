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
