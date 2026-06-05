# CLAUDE.md
# Entry Point for AI Development Rules

You are working inside a structured monolithic application with strict architectural, data, and UI constraints. Do not improvise structural patterns outside what these files define.

This file defines:
1. How to load instructions
2. When to consult each instruction file
3. Non-negotiable rules
4. Execution behavior

---

# 1. MANDATORY LOAD ORDER

Before performing ANY task, you must load and understand:

1. `Governance/01_PROJECT_STACK_AND_GLOBAL_RULES.md`

Then, dynamically load additional files depending on the task.

---

# 2. CONTEXTUAL LOADING RULES

## Backend Work (services, routes, business logic)
ALWAYS load:
- `Governance/02_BACKEND_ARCHITECTURE.md`
- `Governance/04_DATA_AND_NAMING_RULES.md`

IF the task involves mutations (create/update/delete):
- ALSO load `Governance/05_AUDIT_LOGGING_RULES.md`

IF the task involves authentication or user context:
- ALSO load `Governance/06_AUTH_AND_REQUEST_USER_RULES.md`

IF the task involves team members or hierarchy:
- ALSO load `Governance/07_TEAM_MEMBER_AND_HIERARCHY_RULES.md`

---

## Frontend Work (React / UI / pages)
ALWAYS load:
- `Governance/03_FRONTEND_ARCHITECTURE.md`
- `Governance/04_DATA_AND_NAMING_RULES.md`

IF working with:
- Tables → enforce DataGrid rules
- Dropdowns → enforce ComboBox rules

IF working with dates:
- ALSO load `Governance/08_DATE_AND_PERMISSION_RULES.md`

---

## Permissions / Security
ALWAYS load:
- `Governance/06_AUTH_AND_REQUEST_USER_RULES.md`
- `Governance/08_DATE_AND_PERMISSION_RULES.md`

---

## Dates / Formatting
ALWAYS load:
- `Governance/08_DATE_AND_PERMISSION_RULES.md`

---

## Holiday Swaps
IF the task involves holiday swaps (creation, editing, cancellation, day calculation, or time-off validation):
- ALWAYS load `Governance/09_HOLIDAY_SWAPS.md`
- Key invariant: the replacement date is a personal holiday and must flow through `loadHolidaysForCalc` and the swap validation rules.

---

## API Routes
IF the task involves creating or modifying a route:
- ALWAYS load `Governance/12_API_RESPONSE_CONVENTIONS.md`
- ALWAYS load `Governance/13_ERROR_HANDLING.md`
- New routes wrap success responses in `{ data: T }`
- Errors stay flat: `{ error: string }`
- Domain errors extend `AppError` from `src/errors/AppError.ts`
- If touching a legacy route or service that uses a different error pattern, propose migration but do not apply automatically
- **Frontend never manually unwraps `.data`** — `api.ts` handles this automatically for both new `{ data: T }` routes and legacy raw-`T` routes. Do not add `.data` accessors in frontend consumers.

---

## Forms
IF the task involves creating or modifying a form:
- ALWAYS load `Governance/11_FORM_PATTERNS.md`
- All forms use `react-hook-form` — no `useState` per field
- If an existing form violates this, propose the migration but do not apply it automatically

---

## Database / Schema Changes
IF the task requires adding or modifying tables, columns, indexes, or constraints:
- ALWAYS load `Governance/10_DATABASE_MIGRATION_RULES.md`
- Never suggest or run `prisma migrate` or `prisma db push`
- Generate a PostgreSQL SQL script and hand it to the DB team

---

## AI / LLM Integration
IF the task involves calling an external AI model (completions, embeddings, image generation, audio):
- ALWAYS load `Governance/15_FUELIX_AI_API.md`
- Use the Fuel iX API (`https://api.fuelix.ai/v1/chat/completions`) — do NOT call provider APIs (Anthropic, OpenAI, Google) directly
- Select the model from the approved list in that file; default to `claude-sonnet-4-6` for general use

---

## Cross-domain or unclear tasks
LOAD ALL files.

---

# 3. NON-NEGOTIABLE RULES

## 3.1 Database Migrations (PRODUCTION RULE)
- NEVER run `prisma migrate`, `prisma db push`, or any DDL from the application layer
- When a schema change is needed: generate a PostgreSQL SQL script and hand it to the DB team
- Wait for DB team confirmation before writing code that depends on the new schema
- After confirmation: update `schema.prisma` and run `prisma generate` only
- See `Governance/10_DATABASE_MIGRATION_RULES.md` for the full process and SQL script format

## 3.2 Prisma is Source of Truth
- NEVER rename fields
- NEVER transform DTOs unnecessarily
- Backend + frontend must match schema EXACTLY

## 3.3 No Layer Violations
- Routes/controllers must NOT contain business logic
- Logic must live in services
- Services must follow orchestrator pattern

## 3.4 Audit Logging is REQUIRED
For every:
- CREATE
- UPDATE
- DELETE

You MUST call:
`auditOrchestrator.log(...)`

**Exception — `es` schema tables**: The `es` schema holds transient tables that are created and dropped dynamically by technical users as part of persistence operations against the `ds` schema. These tables can appear and disappear at runtime and are exempt from audit logging unless explicitly directed to add it. All other schemas (`ds`, `public`, etc.) require audit logging without exception.

**Passing values to `auditOrchestrator.log`**: `oldValues` and `newValues` are typed as `Record<string, unknown>`. When passing a Prisma result object, cast it with `as unknown as Record<string, unknown>` — this is correct and intentional. `auditOrchestrator.log` is the only place this cast is acceptable; do NOT use it elsewhere to escape the type system.

---

## 3.5 req.user is COMPLETE
- Use `req.user` values already resolved by middleware — do not re-query the DB to resolve user identity
- Do not re-query unless there is a genuine functional need unrelated to identity resolution
- Use:
  - `req.user.email` — the OneLogin email address
  - `req.user.dsUserId` — the `tbl_users.usr_id` primary key; this is the link between a team member and their OneLogin auth user. Use this for `createdBy`/`updatedBy` DB fields (Rule 3.10)
  - `req.user.teamMemberId` — the `tbl_team_members` primary key for that person as an employee. Use this when filtering or referencing someone's team member record (e.g., their time-off, shifts, assignments)

**Exception — `POST /api/auth/refresh`**: this route intentionally resolves identity from the DB (via `userService.syncUserFromToken`, `resolvePermissions`, and `getDsUserByEmail`) because it is building the user payload for the frontend. This is not a business route; it is the one place where identity resolution from DB is required by design. Do not treat it as a violation of this rule.

---

## 3.6 Team Member Hierarchy Rule
- NEVER write custom hierarchy queries
- NEVER call `getReports(...)` directly from a route or feature service
- Each feature must have its own purpose-built wrapper inside `src/services/teamMember/queries/` that calls `getReports(...)` internally and returns a feature-specific DTO
- Existing wrappers: `getReportsForActivityLog`, `getReportsForPendingRequests`, `getReportsForCountdownNotification`
- See `Governance/07_TEAM_MEMBER_AND_HIERARCHY_RULES.md` for the full wrapper pattern

---

## 3.7 UI Constraints (STRICT)
- Tables → MUST use DataGrid
- Dropdowns → MUST use ComboBox (with search)
- No plain `<select>`

---

## 3.8 Date Handling (Frontend only)
- In frontend code, NEVER use `new Date(rawDate)` for parsing or display
- ALWAYS use the frontend utilities:
  - `parseUTCDateAsLocal`
  - `formatUTCDate`
- Backend services writing to Prisma may use `new Date(string)` directly — these utilities do not exist in the backend

---

## 3.9 Naming Convention
- camelCase everywhere
- Must match Prisma schema EXACTLY

---

## 3.10 TypeScript Strictness
- NEVER use `any`. We own both the schema and the APIs — the type is always knowable. If you do not know it, find it before writing code.
- NEVER use non-null assertions (`!`) unless the nullability is structurally impossible and you can explain why in a comment.
- All function parameters, return types, and shared interfaces must be explicitly typed.
- Type inference inside a function body is fine; exported shapes must be declared.

---

## 3.11 Created By / Updated By Fields
- ALWAYS use `tbl_users.usr_id` (exposed as `req.user.dsUserId`) for `createdBy` and `updatedBy` fields
- NEVER use a team member ID, email, or any other identifier for these fields
- The value is already resolved by middleware — read it from `req.user.dsUserId` directly, do not re-query
- NEVER use a `?? 0` (or any numeric fallback) when reading identity fields from `req.user` — throw `new AppError('Unauthenticated', 401)` instead. A fallback of `0` silently writes a phantom user ID to the DB and the request appears to succeed.

---

## 3.12 Time-Off Changelog Must Store Full DB Row Snapshots
When calling `createTimeOffChangeLog` (from `src/services/timeoff/changelog/index.ts`), both `oldValues` and `newValues` MUST be the complete raw row from `ds.tbl_tms_time_off` with actual DB column names (`tto_stadat`, `tto_enddat`, `sta_id`, etc.) — never a partial Prisma model object.

Use `fetchRawTimeOffRow(timeOffId)` to obtain the snapshot:
- **CREATE**: `oldValues = null`, `newValues = await fetchRawTimeOffRow(created.timeOffId)` (fetched after insert)
- **UPDATE / CANCEL**: `oldValues = await fetchRawTimeOffRow(timeOffId)` (fetched before the write), `newValues = await fetchRawTimeOffRow(timeOffId)` (fetched after)

This ensures the changelog view (`ds.vw_timeoff_changelog_activity`) can compute field diffs via `jsonb_object_keys` correctly, and financial triage queries can extract date/status fields by their real DB column names.

## 3.13 Workaround Protocol
When a task requires a workaround due to a constraint in an underlying layer, **STOP before implementing** and present the situation to the user in this format:

1. **What the workaround is** — the change you would make to move forward as-is
2. **Why it is needed** — the underlying design or constraint that forces it
3. **What the proper fix would look like** — what would need to change at the root layer so the workaround would not be necessary
4. **Ask the user** — proceed with the workaround, or address the root cause first?

Do not implement a workaround silently. A workaround that is invisible is a hidden liability.

---

## 3.14 Commit and PR Format Rules
- NEVER add `Co-Authored-By: Claude` (or any AI attribution) to commit messages or PR descriptions
- NEVER include a `Test Plan` section in PR descriptions
- PR descriptions must contain only: a summary of what changed and why

---

## 3.15 Permission Actions
The only valid `PermissionAction` values are `'read'`, `'create'`, and `'delete'`.
There is no `'update'` action — use `'create'` for any mutation that is not a deletion.

---

# 4. ARCHITECTURAL EXPECTATIONS

## Backend
- Domain-based structure
- Orchestrator + Components pattern
- Small, composable files
- No "God services"

## Frontend
- Follow Metronic React strictly
- No custom layout systems
- Use documented patterns only

---

# 5. DECISION FLOW (WHEN UNSURE)

**For non-trivial tasks** (any implementation touching more than one file or introducing a new pattern), present a step-by-step plan of what you intend to modify before writing any code. Wait for confirmation before proceeding.

You MUST follow this order:

1. Check Prisma schema
2. **If schema is missing a field/table → STOP. Generate SQL script. Hand off to DB team. Do not continue.**
3. Check architecture rules
4. Check domain ownership (which service?)
5. Check UI rules (if frontend)
6. If a requested change conflicts with these rules → stop and explain the conflict clearly before proceeding
7. If still unclear → ASK before implementing

---

# 6. FAILURE CONDITIONS (DO NOT DO)

You must NOT:

- Invent new patterns
- Rename DB fields
- Skip audit logging
- Query hierarchy manually
- Use basic selects instead of ComboBox
- Use raw Date parsing
- Duplicate logic across services
- Run `prisma migrate`, `prisma db push`, or any DDL from the app layer
- Write code that depends on a schema change before the DB team confirms it is applied
- Use `useState` per field in a new form — always use `react-hook-form`
- Auto-refactor an existing form that violates the form pattern — propose it first
- Return raw `T` from a new route — always wrap in `{ data: T }`
- Auto-migrate a legacy route to the new envelope — propose it first
- Throw plain `Error` from a new service — always extend `AppError`
- Hardcode a status code in a route by inspecting `err.message` content
- Auto-migrate legacy error patterns — propose it first
- Save a partial Prisma model object to the time-off changelog — always use `fetchRawTimeOffRow` to snapshot the full DB row before and after the operation

---

# 7. RESPONSE STYLE

When generating code:

- **The simplest solution is most likely the best solution.** Default to it unless there is a clear reason not to.
- Be precise and production-ready
- Follow existing patterns
- Do NOT explain obvious things
- Do NOT over-engineer
- Keep outputs modular and readable

---

# 8. PRIORITY ORDER

If rules conflict, prioritize:

1. Prisma schema
2. Audit logging
3. Backend architecture rules
4. Frontend architecture rules
5. Convenience

---

# 9. SUMMARY

This is a **strict system**.

You are not designing freely.
You are extending an existing architecture.

Every decision must align with:
- Prisma schema
- Domain structure
- Orchestrator pattern
- UI constraints
- Audit requirements

If something does not clearly fit → ASK.
