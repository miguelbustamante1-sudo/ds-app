import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { BackToHubButton } from '@/components/BackToHubButton';
import { formatUTCDate } from '@/lib/utils';
import { getHrPartnerView } from '@/api/performanceCases';
import { formatCaseTitle } from './caseDisplay';
import type { PerformanceCaseDisplayDTO } from '@shared/dto';

export function HrPartnerViewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PerformanceCaseDisplayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    getHrPartnerView().then(setRows).finally(() => setLoading(false));
  }, []);

  const columns = useMemo<ColumnDef<PerformanceCaseDisplayDTO>[]>(() => [
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
    { accessorKey: 'severityTier', header: ({ column }) => <DataGridColumnHeader title="Tier" column={column} /> },
    { accessorKey: 'currentPhase', header: ({ column }) => <DataGridColumnHeader title="Phase" column={column} /> },
    {
      accessorKey: 'caseStatus',
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      cell: ({ row }) =>
        row.original.caseStatus === 'CLOSED_ESCALATED' ? (
          <Badge variant="destructive">Closed — Escalated</Badge>
        ) : (
          row.original.caseStatus
        ),
    },
    {
      accessorKey: 'createdDate',
      header: ({ column }) => <DataGridColumnHeader title="Created" column={column} />,
      cell: ({ row }) => formatUTCDate(row.original.createdDate),
    },
  ], [navigate]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Performance Cases — HR Partner View</ToolbarPageTitle>
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
