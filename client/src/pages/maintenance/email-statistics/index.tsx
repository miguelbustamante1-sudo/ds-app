import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { BackToHubButton } from '@/components/BackToHubButton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet } from '@/lib/api';
import type { SendDataPointDTO, SendStatisticsReportDTO } from '@shared/dto';

const columns: ColumnDef<SendDataPointDTO>[] = [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Timestamp" />,
    // These are true UTC instants with a meaningful time-of-day (15-minute
    // buckets), not date-only fields — formatUTCDate would drop the time.
    cell: ({ row }) => format(new Date(row.original.timestamp), 'dd-MMM-yyyy HH:mm'),
  },
  {
    accessorKey: 'deliveryAttempts',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Delivery Attempts" />,
  },
  {
    accessorKey: 'bounces',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Bounces" />,
  },
  {
    accessorKey: 'complaints',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Complaints" />,
  },
  {
    accessorKey: 'rejects',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Rejects" />,
  },
];

export function EmailStatisticsPage() {
  const { canRead } = usePermissions();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['email-statistics'],
    queryFn: () => apiGet<SendStatisticsReportDTO>('/api/email-statistics'),
    enabled: canRead('EmailAdmin'),
  });

  const dataPoints = useMemo(() => data?.dataPoints ?? [], [data]);

  const table = useReactTable({
    data: dataPoints,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('EmailAdmin')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Email Send Statistics</ToolbarPageTitle>
          <ToolbarDescription>
            Rolling SES sending activity — no date range selection; AWS only exposes a
            short recent window of 15-minute buckets.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/maintenance-hub" />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 me-1 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Card className="mt-4">
        <CardContent>
          <CardTitle className="mb-4">Send Quota</CardTitle>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-md border px-4 py-3">
                <p className="text-xs text-muted-foreground">Max 24hr Send</p>
                <p className="text-lg font-semibold">{data?.quota.max24HourSend ?? '—'}</p>
              </div>
              <div className="rounded-md border px-4 py-3">
                <p className="text-xs text-muted-foreground">Sent Last 24hr</p>
                <p className="text-lg font-semibold">{data?.quota.sentLast24Hours ?? '—'}</p>
              </div>
              <div className="rounded-md border px-4 py-3">
                <p className="text-xs text-muted-foreground">Max Send Rate</p>
                <p className="text-lg font-semibold">{data?.quota.maxSendRate ?? '—'} / sec</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <CardTitle className="mb-4">Send Data Points</CardTitle>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={dataPoints.length}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
