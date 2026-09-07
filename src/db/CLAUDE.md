# Database Migration Rules

## Core Rule
**Never run database migrations from the application layer.**

The database team owns all DDL execution. Never include or suggest the following commands:
- `prisma migrate dev`
- `prisma migrate deploy`
- `prisma db push`
- Any raw `ALTER TABLE`, `CREATE TABLE`, `DROP COLUMN`, or other DDL executed from the app

## When a Schema Change Is Required

1. **Generate a PostgreSQL SQL script** (see format below).
2. **Hand off the script** to the database team for execution.
3. **Wait for confirmation** that the DB team has applied the change.
4. **Update the Prisma schema** (`schema.prisma`) to reflect the new structure — but do NOT run `prisma migrate`.
5. **Run `prisma generate`** to regenerate the Prisma client after schema.prisma is updated.

Do not proceed with backend or frontend code that depends on a new schema until the DB team confirms the change is applied.

## SQL Script Format

All generated SQL scripts must:

- Target **PostgreSQL**.
- Use `IF NOT EXISTS` guards on `CREATE TABLE` and `CREATE INDEX` to make scripts idempotent.
- Use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column THEN NULL; END $$;` blocks for `ADD COLUMN` to make them safe to re-run.
- Include a comment header with: purpose, date, and affected table(s).
- Never include `DROP` statements unless explicitly requested and confirmed by the user.
- Match column types to what Prisma would generate (e.g. `TEXT`, `INTEGER`, `BOOLEAN`, `TIMESTAMP WITH TIME ZONE`, `SERIAL` / `BIGSERIAL`).
- Use **snake_case** for all DB column and table names (Prisma maps these to camelCase via `@map`).

### Example — Adding a nullable column

```sql
-- Purpose: Add approvedBy column to time_off_requests
-- Date: 2026-05-07
-- Table: time_off_requests

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_off_requests'
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE time_off_requests
      ADD COLUMN approved_by INTEGER REFERENCES ds_users(id);
  END IF;
END $$;
```

### Example — Adding a new table

```sql
-- Purpose: Create compensatory_time table
-- Date: 2026-05-07
-- Table: compensatory_time

CREATE TABLE IF NOT EXISTS compensatory_time (
  id             SERIAL PRIMARY KEY,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id),
  hours          NUMERIC(5, 2) NOT NULL,
  reason         TEXT,
  created_by     INTEGER NOT NULL REFERENCES ds_users(id),
  created_date   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensatory_time_team_member
  ON compensatory_time (team_member_id);
```

## Prisma Schema Update (After DB Confirmation)

Once the DB team confirms the change is applied, update `schema.prisma` to match:

- Add the new model or field.
- Use `@map("snake_case_column_name")` when the DB column name differs from the Prisma field name.
- Run `npx prisma generate` to regenerate the client.
- Do **not** run `npx prisma migrate` at any point.

## Decision Shortcut

> **Any time a feature requires a field or table that does not exist in the current Prisma schema:**
> Stop → generate SQL → hand off → wait → update schema.prisma → generate client → then write the feature code.
