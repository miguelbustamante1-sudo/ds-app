# Frontend Architecture

## Framework Rule
All UI work must follow Metronic React conventions and patterns.

Primary references:
- Metronic React documentation
- Metronic guides for adding pages, providers, routing, layouts, and hooks
- ReUI component documentation

## Page Construction Rule
When creating or modifying a page, align with the documented Metronic React approach for:
- page placement
- layout usage
- routing
- provider usage
- hook patterns

## Menu and Option Placement
All new options, menu items, or selectable elements must be placed in the correct logical position in the UI.

If placement is genuinely ambiguous, ask before implementing.

## Index Pages: Mandatory DataGrid
All list or index pages must use the ReUI DataGrid component.

Every DataGrid must include:
- search or filter capability
- sorting
- pagination
- column management where appropriate

## DataGrid Filtering Rule
All DataGrid filters must use `DataGridColumnFilter` from `@/components/ui/data-grid-column-filter`. The reference implementation is `maintenance/supervisor-assignments/index.tsx`.

**Rules:**
- Never use standalone `Input` or `Select` components as column filters outside the table.
- Never manage filter state with custom `useState` outside TanStack — all filtering must go through `column.setFilterValue()` so TanStack controls row count, pagination, and facet values.
- For **enum/categorical** columns (Status, Category, Level): use `DataGridColumnFilter` with an `options` array. If values are fixed/known at compile time, define `options` as a static constant. If values vary by dataset, derive them from the data with `useMemo`.
- For **free-text** columns (name, ID): use an `Input` wired to `column.setFilterValue()`, styled consistently (`h-8`, `w-[180px]`), placed in the same filter toolbar row.
- Always add a "Reset" button (ghost, `h-8`) that calls `table.resetColumnFilters()` and is only visible when `columnFilters.length > 0`.
- Columns filtered via `DataGridColumnFilter` must define a `filterFn` that checks `value.includes(...)` against the relevant field.
- Enable `getFacetedRowModel` and `getFacetedUniqueValues` on the table when using `DataGridColumnFilter` so facet counts render correctly inside the popover.

**Correct pattern:**
```tsx
// Static options (for known enums)
const STATUS_OPTIONS = [
  { label: 'Approved', value: 'Approved' },
  { label: 'Pending', value: 'Pending' },
];

// Dynamic options (for entity columns)
const supervisorOptions = useMemo(() => {
  const unique = new Map<string, string>();
  items.forEach((item) => {
    if (item.supervisor) {
      unique.set(item.supervisor.teamMemberId.toString(), `${item.supervisor.teamMemberNames} ${item.supervisor.teamMemberSurnames}`);
    }
  });
  return Array.from(unique, ([value, label]) => ({ value, label }));
}, [items]);

// Filter toolbar
<div className="flex items-center gap-2 mt-6">
  <DataGridColumnFilter column={table.getColumn('statusName')} title="Status" options={STATUS_OPTIONS} />
  <DataGridColumnFilter column={table.getColumn('supervisor')} title="Supervisor" options={supervisorOptions} />
  {columnFilters.length > 0 && (
    <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
      Reset <X className="ml-2 h-4 w-4" />
    </Button>
  )}
</div>

// Column definition with filterFn
{
  accessorKey: 'statusName',
  filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.statusName),
  // ...
}
```

## Card Usage Rule
When using the `Card` component, **never use `CardHeader`**. Use only `CardContent` and place the title inside it using `CardTitle`. This prevents the `border-b` separator line from appearing between the title and the content.

**Correct pattern:**
```tsx
<Card>
  <CardContent>
    <CardTitle className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4" />
      Section Title
    </CardTitle>
    {/* content */}
  </CardContent>
</Card>
```

For cards with a title and an action button:
```tsx
<Card>
  <CardContent>
    <div className="flex items-center justify-between mb-4">
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        Section Title
      </CardTitle>
      <Button size="sm">Action</Button>
    </div>
    {/* content */}
  </CardContent>
</Card>
```

Do **not** import or use `CardHeader` in page cards.

## Form Dropdowns: Mandatory ComboBox
All form dropdowns must use the ReUI ComboBox with search functionality.

Do not use:
- plain HTML `select`
- non-searchable custom dropdowns

---

# UDS Color Tokens

All color styling must use UDS TELUS semantic tokens — never Tailwind primitive colors (`green-500`, `amber-300`, `blue-600`, etc.) or hardcoded hex values.

Token categories: `uds-telus-purple-*`, `uds-telus-green-*`, `uds-system-grey-*`, `uds-system-red-*`, `uds-system-amber-*`, `uds-system-blue-*`, `uds-system-green-*`.

Source of truth: `.design-system/uds-tokens.json` → generated into `client/src/styles/uds-theme.css` (do not edit manually). Regenerate with `node ds-app/scripts/generate-uds-theme.js`.

Metronic semantic vars (`--primary`, `--destructive`, `--muted`, etc.) are already remapped to UDS in `globals.css`. Prefer Metronic utilities (`bg-primary`, `text-muted-foreground`) when they express intent; use raw UDS tokens only when a specific shade is required.

## Status badge helper

Never repeat status switch logic inline. Use the shared helper:

```tsx
import { getStatusBadgeProps } from '@/lib/badge-utils';

const { variant, className } = getStatusBadgeProps(record.statusId);
<Badge variant={variant} className={className}>{record.statusName}</Badge>
```

---

# Hub Navigation Pattern

The sidebar uses hub-based navigation. Each sidebar entry is a hub landing page; pages are NOT added directly to the sidebar.

**Adding a new page:**
1. Identify the hub (`client/src/config/hubs/`).
2. Add a `HubButton` to the correct `.hub.config.ts`.
3. Register the route in `app-routing-setup.tsx` inside `<RequireAuth>`.
4. Do NOT add a new sidebar entry.

**Hub page component** — always use the shared `HubPage`, never build custom:
```tsx
import { HubPage } from '@/components/hub/HubPage';
import { myHubConfig } from '@/config/hubs/my-domain.hub.config';

export default function MyDomainHubPage() {
  return <HubPage config={myHubConfig} />;
}
```

See `Governance/03_FRONTEND_ARCHITECTURE.md` for full hub config shape and RBAC filtering details.

---

# Date and Permission Rules

## Frontend Date Rule
Dates are stored at UTC midnight. Directly passing a UTC date string into JavaScript `new Date(...)` can shift the visible date backward in local timezones behind UTC.

Do not parse date-only values with raw `new Date(record.startDate)`.

## Required Date Utilities
Use the existing frontend utilities from `client/src/lib/utils.ts`:
- `parseUTCDateAsLocal`
- `formatUTCDate`

## Display Date Format
All user-facing dates must display in `dd-MMM-yyyy` format (e.g. `20-Mar-2026`).

This is the default format in `formatUTCDate`. Do not override it with a different format string unless there is an explicit technical reason (e.g. an input field that requires ISO format).

## Permission Actions
The valid permission actions are:
- `read`
- `create`
- `delete`

Use `create` for both create and update operations:
- `read` for GET and view access
- `create` for POST, PUT, and PATCH style mutations
- `delete` for deletions

---

# Data and Naming Rules — Frontend

## Prisma Alignment Rule
Frontend interfaces must align with Prisma schema field names exactly.

This includes:
- frontend interfaces
- props that carry API response data

## No Unnecessary Mapping
Do not rename fields received from the API for stylistic reasons. Keep `teamMemberId` as `teamMemberId`.

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

Do not use `teamMemberKnownAs` as the primary display name.

## Correct Display Examples
- `${m.teamMemberNames} ${m.teamMemberSurnames}`
- `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`
