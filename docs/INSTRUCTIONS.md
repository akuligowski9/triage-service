# Triage Service — Instructions

> **Read this first at the start of every session.**

---

## Purpose of This Document

This is the single authority document for how work is planned, tracked, and documented in the Triage Service project. All Claude sessions must follow these conventions.

---

## Project Identifier

**Prefix:** `TRG`
**Repo:** `akuligowski9/triage-service` (private)
**Location:** `/Users/akuligowski/Code/MyDev/triage-service/`

---

## Source of Truth Hierarchy

When documents conflict, defer in this order:

1. **INSTRUCTIONS.md** (this file) — process rules
2. **BACKLOG.md** — committed scope and status
3. **PROGRESS.md** — chronological decision log
4. **CLAUDE.md** — preferences and build commands
5. **Tech spec** (`/Users/akuligowski/Code/MyDev/triage-service-tech-spec.md`) — architecture reference

---

## Authoritative Document Structure

```
Root:
  README.md           — public-facing project overview
  CLAUDE.md           — Claude preferences, build commands, hard stops

docs/:
  INSTRUCTIONS.md     — this authority document
  PROGRESS.md         — chronological session log
  BACKLOG.md          — source of truth for committed work
```

---

## Canonical Status Flow

```
Planned --> In Progress --> Done
                       \-> Blocked
                       \-> Archived
```

- **Planned** — scoped, accepted, not yet started
- **In Progress** — actively being worked on (only 1 item at a time)
- **Blocked** — cannot proceed, reason documented
- **Done** — acceptance criteria met, code committed
- **Archived** — abandoned or superseded

---

## Priority System

- **Critical** — project cannot function without this
- **High** — core pipeline functionality
- **Medium** — important but not blocking
- **Low** — nice-to-have, do if time permits

---

## Backlog Semantics

- **Committed items** live in Critical / High / Medium / Low sections
- **Parking Lot** holds ideas not yet scoped or committed
- **Documented Gaps** tracks known limitations accepted for v1
- **Done** section lists completed items

---

## BACKLOG.md Item Format

```markdown
### TRG-###: <Short Title>

#### Description

<3+ sentences: problem context, proposed solution, implementation notes>

#### Acceptance Criteria

- [ ] <Specific, testable criterion>
- [ ] <Specific, testable criterion>

#### Metadata

- **Status:** Planned | In Progress | Blocked | Done | Archived
- **Priority:** Critical | High | Medium | Low
- **Type:** Feature | Bug | Maintenance | Enhancement
- **Assignee:** Unassigned
- **GitHub Issue:** No | #<issue_number>
- **Session Notes:** (optional)
```

---

## Task Scoping Rule

- Each backlog item should touch **no more than 3 files per step**.
- Work on **one item at a time** — finish or block before moving on.
- If a task grows beyond scope, split it into sub-items.

---

## Destructive Action Protocol

Before any destructive action (deleting files, dropping tables, force-pushing, resetting state):

1. State what will be destroyed
2. State why it is necessary
3. Confirm no alternative exists
4. Ask for explicit user confirmation
5. Proceed only after confirmation

---

## Safe Word: "MUFFINS"

If the user says MUFFINS at any point:
- **Stop all work immediately**
- **Do not commit, push, or modify anything**
- **Enter recovery mode**: summarize current state, list uncommitted changes, await instructions

---

## Action-Based Documentation Sync

Update PROGRESS.md and BACKLOG.md:
- After completing any backlog item
- After every 5 file modifications
- At the end of every work session

---

## End of Work Block

Before ending any session:

1. Update BACKLOG.md statuses
2. Add PROGRESS.md entry for the session
3. Commit all changes
4. List any blockers or open questions for next session
