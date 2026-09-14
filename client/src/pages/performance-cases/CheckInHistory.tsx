import { useMemo, useState } from 'react';
import { ColumnDef, SortingState, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatUTCDate } from '@/lib/utils';
import type { PerformanceCaseCheckInDTO } from '@shared/dto';

const STATUS_LABELS: Record<PerformanceCaseCheckInDTO['status'], string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  NO_PROGRESS: 'No Progress',
};

function statusBadge(status: PerformanceCaseCheckInDTO['status']) {
  if (status === 'NO_PROGRESS') return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
  if (status === 'AT_RISK') return <Badge variant="warning" appearance="light">{STATUS_LABELS[status]}</Badge>;
  return <Badge variant="primary" appearance="light">{STATUS_LABELS[status]}</Badge>;
}

interface CheckInHistoryProps {
  checkIns: PerformanceCaseCheckInDTO[];
  loading: boolean;
}

export function CheckInHistory({ checkIns, loading }: CheckInHistoryProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'checkInDate', desc: true }]);

  const columns = useMemo<ColumnDef<PerformanceCaseCheckInDTO>[]>(
    () => [
      {
        accessorKey: 'checkInDate',
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) => formatUTCDate(row.original.checkInDate),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorKey: 'tmUpdate',
        header: ({ column }) => <DataGridColumnHeader title="TM Update" column={column} />,
        cell: ({ row }) => <span className="whitespace-pre-wrap">{row.original.tmUpdate ?? '—'}</span>,
        enableSorting: false,
      },
      {
        accessorKey: 'managerFeedbackReceived',
        header: ({ column }) => <DataGridColumnHeader title="Manager Feedback" column={column} />,
        cell: ({ row }) => (row.original.managerFeedbackReceived ? 'Received' : 'Missing'),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: checkIns,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4">Check-in History</CardTitle>
        {loading ? (
          <div className="text-muted-foreground text-sm py-4">Loading...</div>
        ) : checkIns.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4">No check-ins logged yet.</div>
        ) : (
          <DataGridContainer>
            <DataGrid table={table} recordCount={checkIns.length}>
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        )}
      </CardContent>
    </Card>
  );
}
