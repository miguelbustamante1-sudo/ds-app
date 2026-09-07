# Data and Naming Rules

## Prisma Alignment Rule
All backend and frontend data contracts must align with Prisma schema field names exactly.

This includes:
- request DTOs
- response DTOs
- frontend interfaces
- internal transport shapes that cross layer boundaries

## No Unnecessary Mapping
Avoid translating one field name into another just for stylistic reasons.

Bad example:
- database uses `teamMemberId`
- API returns `memberId`
- frontend consumes `selectedMemberId`

Good example:
- keep `teamMemberId` consistently unless a transformation is functionally required

## Team Member Display Name Rule
Always display a team member's formal full name as:

`teamMemberNames + " " + teamMemberSurnames`

Use this consistently in:
- dropdowns
- ComboBoxes
- DataGrid cells
- labels
- headings
- selection surfaces

## Do Not Use These as Replacements
Do not use:
- `teamMemberKnownAs` as the primary display name
- `teamMemberFullName` in selection contexts if it can vary based on known-as logic

## Correct Display Examples
- `${m.teamMemberNames} ${m.teamMemberSurnames}`
- `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`

The goal is consistent formal display across the product.

## Table and Column Naming Convention

Every table is named with a **3-letter prefix** followed by the entity name:

```
<prefix>_<entity_name>
```

All columns in that table use the same 3-letter prefix:

```
-- Table: upl_uploads
upl_id            SERIAL PRIMARY KEY
upl_original_name VARCHAR(500)
upl_storage_key   VARCHAR(1000)
upl_created_by    INT
upl_created_date  TIMESTAMP
```

### Foreign Key Column Names

When a table holds a foreign key to another table, the FK column takes the **referenced table's prefix** — not the host table's prefix. This makes the reference self-documenting.

```
-- Table: tmi_team_member_image
tmi_id       SERIAL PRIMARY KEY   -- own columns use tmi_
tmi_filename VARCHAR(500)
upl_id       INT REFERENCES upl_uploads(upl_id)  -- FK uses upl_ (the referenced table's prefix)
```

Reading `upl_id` in any table immediately tells you it points to `upl_uploads`.

### Choosing the 3-Letter Prefix

The prefix must describe **what the entity is**, not which feature or domain it belongs to.

Good — describes the entity:
- `upl_uploads` → `upl` = upload
- `nom_nominations` → `nom` = nomination
- `cyc_cycles` → `cyc` = cycle
- `met_metrics` → `met` = metric

Bad — encodes the domain/feature instead:
- `tpm_metrics` ← `tp` is the feature (Top Performers), not the entity
- `tpn_nominations` ← same problem

If two features both need a "metrics" concept, disambiguate in the **table name**, not the prefix:
- `met_tp_metrics` (Top Performers metrics)
- `met_sales_metrics` (Sales metrics)

Both use `met_` because they are metrics tables. The suffix carries the disambiguation.

### Rules

- The default schema for all new tables is `ds`. Only use a different schema (`sec`, `com`, etc.) when explicitly directed by the user.
- Do NOT use a generic `tbl_` prefix for new tables.
- Do NOT use a feature/domain name as the prefix — the prefix describes the entity.
- Do NOT name a FK column after the host table (e.g. `tmi_upload_id` is wrong — use `upl_id`).
- The 3-letter prefix must be unique per entity type across the schema.