import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatUTCDate } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { usePendingRequests } from './hooks/usePendingRequests';
import { useReviewPendingRequest } from './hooks/useReviewPendingRequest';
import type { PendingRequest } from '@shared/dto/PendingRequest';

type TypeFilter = 'All' | 'TimeOff' | 'HolidaySwap';

export function PendingRequestsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { requests, loading, loadRequests } = usePendingRequests();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [acknowledgedStatusId, setAcknowledgedStatusId] = useState<number | null>(null);
  const [cancelledStatusId, setCancelledStatusId] = useState<number | null>(null);

  const { acknowledge, cancel, isLoading, busy } = useReviewPendingRequest({
    onSuccess: () => {
      toast({ title: 'Request updated' });
      loadRequests().catch(() => {});
    },
    onError: (msg) => toast({ title: 'Error', description: msg, variant: 'destructive' }),
  });

  useEffect(() => {
    loadRequests().catch(() =>
      toast({ title: 'Error', description: 'Failed to load pending requests', variant: 'destructive' }),
    );
    apiGet<Array<{ statusId: number; statusName: string }>>('/api/time-off-statuses')
      .then((statuses) => {
        const ack = statuses.find((s) => s.statusName.toLowerCase() === 'acknowledged');
        const cancelled = statuses.find((s) => s.statusName.toLowerCase() === 'cancelled');
        setAcknowledgedStatusId(ack?.statusId ?? null);
        setCancelledStatusId(cancelled?.statusId ?? null);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === 'All') return requests;
    return requests.filter((r) => r.type === typeFilter);
  }, [requests, typeFilter]);

  const columns = useMemo<ColumnDef<PendingRequest>[]>(
    () => [
      {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant={row.original.type === 'TimeOff' ? 'primary' : 'secondary'}>
            {row.original.type === 'TimeOff' ? 'Time Off' : 'Holiday Swap'}
          </Badge>
        ),
        size: 130,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'teamMember',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.teamMemberNames} {row.original.teamMemberSurnames}
          </span>
        ),
        size: 200,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'details',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Details" />,
        cell: ({ row }) => {
          const r = row.original;
          if (r.type === 'TimeOff') {
            return (
              <div className="flex flex-col text-sm">
                <span className="font-medium">{r.categoryName}</span>
                <span className="text-muted-foreground">
                  {formatUTCDate(r.timeOffStartDate)} → {formatUTCDate(r.timeOffEndDate)}
                  {' '}({r.timeOffDays} {r.timeOffDays === 1 ? 'day' : 'days'})
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col text-sm">
              <span className="font-medium">{r.holidayName}</span>
              <span className="text-muted-foreground">
                {formatUTCDate(r.originalDate)} → {formatUTCDate(r.replacementDate)}
              </span>
            </div>
          );
        },
        enableSorting: false,
        size: 260,
        meta: { headerTitle: 'Details', skeleton: <Skeleton className="h-8 w-48" /> },
      },
      {
        id: 'submittedAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Submitted At" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt ? formatUTCDate(row.original.createdAt) : '—'}
          </span>
        ),
        size: 140,
        meta: { headerTitle: 'Submitted At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={busy || !acknowledgedStatusId}
                onClick={(e) => {
                  e.stopPropagation();
                  acknowledge(r, acknowledgedStatusId!);
                }}
              >
                {isLoading(r, 'ack') ? 'Saving…' : 'Acknowledge'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || !cancelledStatusId}
                onClick={(e) => {
                  e.stopPropagation();
                  cancel(r, cancelledStatusId!);
                }}
              >
                {isLoading(r, 'cancel') ? 'Saving…' : 'Cancel'}
              </Button>
              <button
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/my-team/${r.teamMemberId}`);
                }}
              >
                Profile
              </button>
            </div>
          );
        },
        enableSorting: false,
        size: 280,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-8 w-56" /> },
      },
    ],
    [navigate, acknowledge, cancel, isLoading, busy, acknowledgedStatusId, cancelledStatusId],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize: 10 } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Pending Requests</ToolbarPageTitle>
          <ToolbarDescription>
            All Tentative requests from your team — Time Off and Holiday Swaps.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6">
        {loading ? (
          <div className="bg-card rounded-lg border p-6 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['All', 'TimeOff', 'HolidaySwap'] as TypeFilter[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={[
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      typeFilter === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    ].join(' ')}
                  >
                    {t === 'All' ? 'All' : t === 'TimeOff' ? 'Time Off' : 'Holiday Swaps'}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-card rounded-lg border">
                <div className="text-center py-12 text-muted-foreground">
                  No pending requests found.
                </div>
              </div>
            ) : (
              <DataGridContainer>
                <DataGrid
                  table={table}
                  recordCount={table.getFilteredRowModel().rows.length}
                  tableLayout={{ headerBackground: true, headerBorder: true, rowBorder: true }}
                >
                  <DataGridTable />
                  <DataGridPagination sizes={[10, 25, 50]} />
                </DataGrid>
              </DataGridContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
