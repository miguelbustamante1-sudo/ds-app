# Design: Trivia Question Bank

**Date:** 2026-09-24
**Status:** Approved for planning

## Problem

Dashboard "Team Leader Trivia" currently generates 5 questions per request via a live Fuel iX chat completion against a single hardcoded `tl-manual.md` file in GCS, cached in-memory for 12 hours. This has two problems:

1. It's grounded in one static file instead of the full SOP knowledge base already used by the Knowledge Base AI chat.
2. There's no persistence, no history of what was asked or answered, and no fallback if the AI call fails — the in-memory cache resets on every deploy/restart.

## Goals

- Move question generation to an admin-triggered batch pull (not a live per-request or scheduled call) that draws from the SOP knowledge base (the same Fuel iX Copilot assistant + vector store the Knowledge Base AI chat already uses).
- Persist questions to the database so the dashboard serves from a stable pool all day, and a failed AI call never breaks the dashboard.
- Track per-user answer history (what was answered, correct or not).
- Give admins a CRUD maintenance page to review, edit, deactivate, or delete questions, and to trigger new batch pulls.

## Non-goals

- No automated/scheduled (cron) generation — pulls are manual, admin-triggered only.
- No requirement to hit exactly 30 questions per batch — grounding correctness outranks count (see Batch Generation below).
- No change to the "5 questions per dashboard visit" behavior.

## Architecture & Data Flow

### Domain

Trivia is promoted out of `src/services/dashboard/` into its own domain: `src/services/trivia/`, since it now spans batch generation, CRUD, and answer tracking — not just a dashboard widget.

### New surface: Trivia Hub

A new hub, `client/src/pages/trivia-hub/`, with one tile today: **"Manage Trivia Questions"**. The maintenance page is admin-only, gated by the existing `requireRole('admin')` middleware (`src/middleware/auth.ts`) — the same mechanism already used in `storedProcedures.ts`. This checks `req.user.roles`, which is sourced from `auth_users`, per the request that gating be role-based rather than permission-resource-based.

### Batch pull (admin-triggered)

1. Admin clicks **"Pull 30 Questions"** on the maintenance page.
2. `POST /api/trivia/batches` — the backend checks whether a batch is already `pending`. If so, returns `409 Conflict` (this is the concurrency blocker — enforced at the DB level via a partial unique index on `trb_trivia_batches(status)` where `status = 'pending'`, not just an app-level check, so two simultaneous clicks can't both pass). Otherwise it creates a `pending` batch row and responds immediately (fire-and-forget from the client's perspective).
3. The backend continues the work asynchronously in-process:
   - Calls the **same Fuel iX Copilot assistant + vector store** the SOP Knowledge Base chat already uses (`src/services/sop/FuelixCopilotClient.ts`, reused as-is — it's already generic thread/run plumbing with no SOP-specific logic baked in).
   - The prompt requests up to 30 multiple-choice trivia questions, strict JSON, **and explicitly instructs the assistant to only return questions strictly grounded in retrieved knowledge-base content — never invent, infer, or assume facts not present in the source. Returning fewer than 30 questions is acceptable and preferred over fabricating questions to hit the count.**
   - A sample of existing question texts is included in the prompt as "do not repeat these," to reduce (but not guarantee) collisions.
   - The backend polls the run to completion server-side, checking every 3 seconds, up to a 5-minute max wait. If exceeded, or if the run itself errors, the batch is marked `failed` with an `errorMessage`.
4. On a completed run: parse and strictly validate the JSON (adapted from the current `parseTriviaResponse.ts` logic). If the response isn't parseable JSON, or contains zero structurally valid questions, the batch is marked `failed` — this indicates the AI call itself misbehaved, not a dedup outcome. Otherwise, for each valid question, compute a normalized-text hash (lowercased, trimmed, whitespace-collapsed) and attempt to insert. Any insert colliding with an existing `questionHash` (DB unique constraint) is silently skipped — this is the actual dedup guarantee, not just prompt-level guidance.
5. This is a **single pass** — no retry/top-up loop to force reaching 30. The batch may land with fewer than 30 rows, including landing at 0 net-new rows if every valid question turned out to be a duplicate of an existing one. That outcome is still `completed` (with `insertedQuestionCount: 0`), not `failed` — the AI call succeeded and returned valid, grounded questions; they simply weren't new. `failed` is reserved for the AI/parsing call itself misbehaving (API error, timeout, unparseable or structurally empty response).
6. The batch row is updated to `completed` (with `insertedQuestionCount`) or `failed` (with `errorMessage`), which clears the blocker for the next pull.
7. The maintenance page polls `GET /api/trivia/batches/latest` while a batch is pending, shows a spinner/status banner, and refreshes the question list on completion.

### Dashboard (regular users)

`GET /api/dashboard/trivia` no longer calls the LLM live. It selects 5 random `isActive` questions from `trq_trivia_questions`, excluding questions this user answered within the last 7 days (via `tra_trivia_answers.lastAnsweredAt`). If fewer than 5 questions are eligible under the 7-day rule but more exist in the active pool, the selection backfills with the least-recently-answered ones rather than showing fewer than 5. If the total active pool itself has fewer than 5 questions (e.g., before any batch has ever been pulled), the dashboard shows whatever is available without erroring.

Answering posts to `POST /api/trivia/answers` with `{ questionId, selectedOptionIndex }`. The backend upserts the user's row in `tra_trivia_answers` (keyed on `questionId` + `teamMemberId`), increments `answerCount` on repeat answers, sets `lastAnsweredAt = now()`, and returns `{ isCorrect, correctOptionIndex }` so the frontend can reveal the answer.

## Data Model

All new tables live in the `ds` schema, DB-team-applied (see Rollout below) — this repo never runs `prisma migrate`/`db push` from the app layer.

### `ds.trb_trivia_batches`

| column | type | notes |
|---|---|---|
| id | serial PK | |
| status | varchar | `pending` \| `completed` \| `failed` |
| requestedQuestionCount | int | 30 |
| insertedQuestionCount | int, nullable | actual count after dedup, set on completion |
| errorMessage | text, nullable | set on `failed` |
| startedAt | timestamp | |
| completedAt | timestamp, nullable | |
| createdBy | int | FK → `tbl_users.usr_id` |

Partial unique index: `UNIQUE (status) WHERE status = 'pending'` — enforces "only one batch in flight" at the DB level.

### `ds.trq_trivia_questions`

| column | type | notes |
|---|---|---|
| id | serial PK | |
| batchId | int | FK → `trb_trivia_batches.id` |
| questionText | text | |
| questionHash | varchar, **unique** | normalized text; dedup guarantee |
| option1 | text | |
| option2 | text | |
| option3 | text | |
| option4 | text | |
| correctOptionIndex | smallint | 0–3 |
| isActive | boolean, default `true` | manually toggled by an admin via the CRUD page when a question needs to be retired; no automatic deactivation on new batch pulls |
| createdBy | int | FK → `tbl_users.usr_id` |
| createdAt | timestamp | |

### `ds.tra_trivia_answers`

| column | type | notes |
|---|---|---|
| id | serial PK | |
| questionId | int | FK → `trq_trivia_questions.id` |
| teamMemberId | int | FK → `tbl_team_members` PK |
| selectedOptionIndex | smallint | latest attempt |
| isCorrect | boolean | latest attempt |
| answerCount | int, default 1 | incremented on re-answer |
| lastAnsweredAt | timestamp | drives the 7-day reuse rule |
| **unique** | `(questionId, teamMemberId)` | upsert target |

## Backend Components

Domain: `src/services/trivia/`

- `TriviaOrchestrator.ts` — coordinates `pullNewBatch()`, `getActiveQuestionsForDashboard(teamMemberId)`, `submitAnswer(...)`
- `components/GenerateTriviaBatch.ts` — calls `FuelixCopilotClient` (from `src/services/sop/`), enforces the grounding-only system prompt, parses/validates the JSON response (adapted from `parseTriviaResponse.ts`)
- `components/DedupeQuestions.ts` — normalizes text, computes `questionHash`, filters against existing hashes before insert
- `components/SelectDashboardQuestions.ts` — 5 random `isActive` questions per user, 7-day exclusion + backfill logic
- `components/RecordAnswer.ts` — upserts `tra_trivia_answers`, triggers audit logging
- `queries/` — read helpers for the CRUD page (list questions, batch status, answer stats)

Files under `src/services/dashboard/getDashboardTrivia.ts`, `src/services/dashboard/components/loadTlManual.ts`, and `src/services/dashboard/components/parseTriviaResponse.ts` are retired (logic moves into the new `trivia` domain; `loadTlManual`/`tl-manual.md` are no longer used since generation now sources from the SOP knowledge base).

## Routes

`src/routes/trivia.routes.ts` (new):

| method & path | access | purpose |
|---|---|---|
| `POST /api/trivia/batches` | `requireRole('admin')` | start a batch pull; `409` if one is already pending |
| `GET /api/trivia/batches/latest` | `requireRole('admin')` | poll current/last batch status |
| `GET /api/trivia/questions` | `requireRole('admin')` | CRUD list for the maintenance page |
| `PATCH /api/trivia/questions/:id` | `requireRole('admin')` | edit a question / toggle `isActive` |
| `DELETE /api/trivia/questions/:id` | `requireRole('admin')` | delete a question |
| `GET /api/dashboard/trivia` | any authenticated user | existing route, now DB-backed |
| `POST /api/trivia/answers` | any authenticated user | submit/update an answer |

All new routes wrap success responses in `{ data: T }`, throw `AppError` subclasses for business-rule violations, and every mutation (`trb_trivia_batches` CREATE, `trq_trivia_questions` CREATE/UPDATE/DELETE, `tra_trivia_answers` CREATE/UPDATE) is logged via `auditOrchestrator.log` — no `es`-schema exemption applies to any of these tables.

**Known tradeoff:** because every trivia answer submission is itself an audited mutation, this will produce a materially higher volume of audit rows than most features in this app. This follows directly from the non-negotiable audit rule for `ds`-schema tables; flagged here so it's a known, accepted consequence rather than a surprise later.

## Frontend

- `client/src/pages/trivia-hub/index.tsx` — new `HubPage`, one tile: "Manage Trivia Questions"
- `client/src/pages/trivia-hub/manage-questions/index.tsx` — DataGrid of questions (text, options, correct answer, `isActive` toggle, batch/date), "Pull 30 Questions" button (disabled + spinner while a batch is pending, driven by polling `GET /api/trivia/batches/latest`), `<BackToHubButton hubPath="/trivia-hub" />`
- `client/src/pages/components/TriviaPanel.tsx` — existing dashboard widget, updated to: consume the DB-backed 5-question response, reveal correctness from the `POST /api/trivia/answers` response, and degrade gracefully (fewer than 5 questions, or zero) instead of erroring the dashboard

## Error Handling & Edge Cases

- **Batch generation fails** (Fuel iX error, invalid/unparseable JSON, run timeout, or a structurally empty response): batch marked `failed` with `errorMessage`; the pending-batch blocker clears so an admin can retry; existing question pool is untouched.
- **Batch generation succeeds but yields nothing new** (every valid, grounded question happened to duplicate an existing one): batch marked `completed` with `insertedQuestionCount: 0` — not treated as a failure, since the AI call itself worked correctly.
- **Concurrent pull attempts**: blocked at the DB level via the partial unique index on `trb_trivia_batches(status = 'pending')`, not just an app-level pre-check, to close the race condition between two near-simultaneous clicks.
- **Dashboard with a thin/empty pool** (e.g., before the first batch is ever pulled): `TriviaPanel` shows an empty/low state rather than throwing — this is a change from today's behavior, which threw a 500 if the manual was missing.
- **Duplicate questions across batches**: guaranteed impossible by the `questionHash` unique constraint at insert time, independent of how well the AI respects the "don't repeat" prompt guidance.

## Rollout

Per this repo's migration rules, the three new tables are handed off as a SQL script to the DB team — no `prisma migrate`/`db push` is run from the app layer. Application code that depends on `trb_trivia_batches`, `trq_trivia_questions`, and `tra_trivia_answers` is not written until the DB team confirms the schema is applied, at which point `schema.prisma` is updated and `prisma generate` is run.
