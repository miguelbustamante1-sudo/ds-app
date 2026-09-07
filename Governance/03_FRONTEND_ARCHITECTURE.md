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

Examples include:
- `countries/index.tsx`
- `projects/index.tsx`

Every DataGrid must include:
- search or filter capability
- sorting
- pagination
- column management where appropriate

Prefer DataGrid filtering components instead of ad hoc table filters.

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

---

## Form Dropdowns: Mandatory ComboBox
All form dropdowns must use the ReUI ComboBox with search functionality.

Do not use:
- plain HTML `select`
- non-searchable custom dropdowns

The expected standard is a searchable ComboBox for every form select input.

---

## UDS Color Tokens

All color styling must use UDS TELUS semantic tokens — never Tailwind primitive colors (`green-500`, `amber-300`, `blue-600`, etc.) or hardcoded hex values.

### Token categories
| Prefix | Example utilities |
|---|---|
| `uds-telus-purple-*` | `bg-uds-telus-purple-500`, `text-uds-telus-purple-300` |
| `uds-telus-green-*` | `text-uds-telus-green-400` |
| `uds-system-grey-*` | `bg-uds-system-grey-100`, `text-uds-system-grey-500` |
| `uds-system-red-*` | `border-uds-system-red-500` |
| `uds-system-amber-*` | `bg-uds-system-amber-100` |
| `uds-system-blue-*` | `text-uds-system-blue-500` |
| `uds-system-green-*` | `border-uds-system-green-500` |

### Source of truth
- Token definitions: `.design-system/uds-tokens.json`
- Generated CSS: `client/src/styles/uds-theme.css` (do not edit manually)
- Regenerate with: `node ds-app/scripts/generate-uds-theme.js`
- Imported globally in `client/src/styles/globals.css`

### Metronic semantic vars are mapped to UDS
`globals.css` remaps Metronic's CSS vars (`--primary`, `--destructive`, `--muted`, etc.) to UDS tokens. Prefer Metronic semantic utilities (`bg-primary`, `text-muted-foreground`) when they express intent; use raw UDS tokens only when a specific shade is required.

### Status badge helper
For status-based badge styling, always use the shared helper — never repeat the switch inline:

```tsx
import { getStatusBadgeProps } from '@/lib/badge-utils';

const { variant, className } = getStatusBadgeProps(record.statusId);
<Badge variant={variant} className={className}>
  {record.statusName}
</Badge>
```

`getStatusBadgeProps(statusId, defaultVariant?)` maps status IDs (1 Tentative, 2 Approved, 3 Taken, 4 Cancelled, 5 Rejected) to UDS-token badge props.

---

## Hub Navigation Pattern

The sidebar uses a **hub-based navigation** model. Each sidebar entry links to a hub landing page that displays role-filtered option cards. Pages are NOT added directly to the sidebar anymore.

### Adding a new page

1. Identify which hub the page belongs to (time-off, self-service, hiring, project-management, operations, communications, governance, security, maintenance, reports).
2. Add a `HubButton` entry to the relevant config file in `client/src/config/hubs/`.
3. Register the route in `client/src/routing/app-routing-setup.tsx` inside `<RequireAuth>`.
4. Do NOT add a new sidebar entry — only add to the hub config.

### Hub config structure

```ts
// client/src/config/hubs/<domain>.hub.config.ts
import { HubConfig } from './hub.types';

export const myHubConfig: HubConfig = {
  key: 'my-domain',
  title: 'My Domain Hub',
  subtitle: 'Optional subtitle shown on the landing page.',
  buttons: [
    {
      title: 'Feature Name',
      description: 'Short description shown on the card.',
      path: '/feature-route',
      permission: 'PermissionResourceName', // optional — mirrors MenuItem.permission
      role: 'bsa',                          // optional — mirrors MenuItem.role
    },
  ],
};
```

For hubs that group buttons into named sections, use `sections` instead of `buttons`:

```ts
sections: [
  {
    title: 'Section Heading',
    description: 'Optional muted text below heading.',
    buttons: [ /* HubButton[] */ ],
  },
]
```

### Hub page component

All hub landing pages use the shared `HubPage` component — never build a custom landing page:

```tsx
// client/src/pages/my-domain-hub/index.tsx
import { HubPage } from '@/components/hub/HubPage';
import { myHubConfig } from '@/config/hubs/my-domain.hub.config';

export default function MyDomainHubPage() {
  return <HubPage config={myHubConfig} />;
}
```

`HubPage` handles RBAC filtering, skeleton loader, empty state, and a11y automatically.

### RBAC filtering
`HubPage` uses the `useVisibleHubButtons` hook (`client/src/hooks/use-visible-hub-buttons.ts`) which reads from the existing auth context. No new permission logic needed — just set `permission` and/or `role` on the `HubButton`.
