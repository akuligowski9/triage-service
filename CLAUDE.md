# Triage Service — Claude Preferences

## Project Context

- **App:** Triage Service — Issue Intake & Triage Workbench
- **Platform:** Node.js (TypeScript)
- **Prefix:** TRG
- **Repo:** akuligowski9/triage-service (private)
- **Location:** /Users/akuligowski/Code/MyDev/triage-service/

## Build Commands

- **Dev:** `npm run dev` (tsx watch)
- **Build:** `npm run build` (tsc)
- **Test:** `npm test` (vitest)
- **Migrate:** `npm run migrate` (knex migrate:latest)
- **Docker:** `docker compose up`

## Session Start

1. Read `docs/INSTRUCTIONS.md`
2. Read `docs/BACKLOG.md` — check current statuses
3. Read `docs/PROGRESS.md` — check last session's state
4. Confirm next task with user before starting

## Preferences

- **Tone:** Direct, concise, systems-oriented
- **Code style:** TypeScript strict, ESM modules, explicit types on exports
- **Architecture:** Hexagonal — domain layer has zero framework imports
- **Approach:** One backlog item at a time, finish or block before moving on

## Hard Stops

- Never commit `.env` or API keys
- Never push to main without user confirmation
- Never skip the INSTRUCTIONS.md read at session start
- Never mix framework code into the domain layer
- Safe word "MUFFINS" — stop all work immediately

## Task Scoping

- Max 3 files per step
- One backlog item at a time
- If scope grows, split the item

## Conflict Resolution

- INSTRUCTIONS.md wins over all other docs
- BACKLOG.md wins over PROGRESS.md
- Tech spec is reference only, not authoritative
