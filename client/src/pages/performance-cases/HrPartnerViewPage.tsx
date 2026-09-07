import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { BackToHubButton } from '@/components/BackToHubButton';
import { formatUTCDate } from '@/lib/utils';
import { getHrPartnerView } from '@/api/performanceCases';
import type { PerformanceCaseDTO } from '@shared/dto';

export function HrPartnerViewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PerformanceCaseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHrPartnerView().then(setRows).finally(() => setLoading(false));
  }, []);

  const columns = useMemo<ColumnDef<PerformanceCaseDTO>[]>(() => [
    {
      accessorKey: 'caseCode',
      header: ({ column }) => <DataGridColumnHeader title="Case" column={column} />,
      cell: ({ row }) => (
        <button onClick={() => navigate(`/performance-cases/${row.original.caseId}`)} className="underline">
          {row.original.caseCode}
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer>
          <DataGrid table={table} recordCount={rows.length}>
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
