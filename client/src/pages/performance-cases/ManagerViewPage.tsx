import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { BackToHubButton } from '@/components/BackToHubButton';
import { formatUTCDate } from '@/lib/utils';
import { getManagerView } from '@/api/performanceCases';
import type { ManagerViewRow } from '@/api/performanceCases';
import { formatCaseTitle } from './caseDisplay';

const SEVERITY_TIER_OPTIONS = [
  { label: 'Standard', value: 'STANDARD' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const CURRENT_PHASE_OPTIONS = [
  { label: 'Phase 0', value: 'PHASE_0' },
  { label: 'Phase 1', value: 'PHASE_1' },
  { label: 'Phase 2', value: 'PHASE_2' },
  { label: 'Phase 3', value: 'PHASE_3' },
  { label: 'Phase 4', value: 'PHASE_4' },
  { label: 'Phase 5', value: 'PHASE_5' },
  { label: 'Phase 6', value: 'PHASE_6' },
  { label: 'Post-Closure', value: 'POST_CLOSURE' },
];

const CASE_STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed — Successful', value: 'CLOSED_SUCCESSFUL' },
  { label: 'Closed — Escalated', value: 'CLOSED_ESCALATED' },
  { label: 'Regressed', value: 'REGRESSED' },
];

function tierBadge(tier: string) {
  if (tier === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  if (tier === 'HIGH') return <Badge variant="warning" appearance="light">High</Badge>;
  return <Badge variant="outline">Standard</Badge>;
}

export function ManagerViewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ManagerViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    getManagerView()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo<ColumnDef<ManagerViewRow>[]>(
    () => [
      {
        id: 'caseTitle',
        accessorFn: (row) => formatCaseTitle(row),
        header: ({ column }) => <DataGridColumnHeader title="Case" column={column} />,
        cell: ({ row }) => (
          <button onClick={() => navigate(`/performance-cases/${row.original.caseId}`)} className="underline text-left">
            {formatCaseTitle(row.original)}
          </button>
        ),
      },
      {
        accessorKey: 'severityTier',
        header: ({ column }) => <DataGridColumnHeader title="Tier" column={column} />,
        cell: ({ row }) => tierBadge(row.original.severityTier),
        filterFn: (row, _id, value: string[]) => value.includes(row.original.severityTier),
      },
      {
        accessorKey: 'currentPhase',
        header: ({ column }) => <DataGridColumnHeader title="Phase" column={column} />,
        filterFn: (row, _id, value: string[]) => value.includes(row.original.currentPhase),
      },
      {
        accessorKey: 'caseStatus',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        filterFn: (row, _id, value: string[]) => value.includes(row.original.caseStatus),
      },
      {
        accessorKey: 'nextEtaDate',
        header: ({ column }) => <DataGridColumnHeader title="Next ETA" column={column} />,
        cell: ({ row }) => (row.original.nextEtaDate ? formatUTCDate(row.original.nextEtaDate) : '—'),
      },
      {
        id: 'atRisk',
        header: ({ column }) => <DataGridColumnHeader title="At Risk" column={column} />,
        cell: ({ row }) =>
          row.original.isEtaOverdue || row.original.hasMissingManagerFeedback ? (
            <Badge variant="destructive" appearance="light">
              {row.original.isEtaOverdue ? 'ETA overdue' : 'Feedback missing'}
            </Badge>
          ) : null,
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Performance Cases — Manager View</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/performance-management-hub" />
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search team member, case code, reason..."
          value={(table.getColumn('caseTitle')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('caseTitle')?.setFilterValue(e.target.value)}
          className="h-8 w-[280px]"
        />
        {table.getColumn('severityTier') && (
          <DataGridColumnFilter column={table.getColumn('severityTier')} title="Tier" options={SEVERITY_TIER_OPTIONS} />
        )}
        {table.getColumn('currentPhase') && (
          <DataGridColumnFilter column={table.getColumn('currentPhase')} title="Phase" options={CURRENT_PHASE_OPTIONS} />
        )}
        {table.getColumn('caseStatus') && (
          <DataGridColumnFilter column={table.getColumn('caseStatus')} title="Status" options={CASE_STATUS_OPTIONS} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer className="mt-4">
          <DataGrid table={table} recordCount={rows.length}>
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
