import { useEffect, useState, useMemo, useCallback } from 'react';
import type { SortingState, ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SentBroadcastDTO } from '@shared/dto/Notification';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { SendAnnouncementDialog } from './send-dialog';
import { RecipientsDialog } from './recipients-dialog';

export function AnnouncementsPage() {
  const { toast } = useToast();

  const [broadcasts, setBroadcasts] = useState<SentBroadcastDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [recipientsDialogOpen, setRecipientsDialogOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<SentBroadcastDTO | null>(null);

  const loadBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<SentBroadcastDTO[]>('/api/notifications/broadcast/sent');
      setBroadcasts(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load announcements';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const handleSendSuccess = () => {
    setSendDialogOpen(false);
    loadBroadcasts();
  };

  const handleViewRecipients = (broadcast: SentBroadcastDTO) => {
    setSelectedBroadcast(broadcast);
    setRecipientsDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<SentBroadcastDTO>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
        size: 250,
        meta: { headerTitle: 'Title', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date Sent" />,
        cell: ({ row }) => (
          <span>{formatUTCDate(row.original.createdAt)}</span>
        ),
        size: 140,
        meta: { headerTitle: 'Date Sent', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'totalRecipients',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Recipients" />,
        cell: ({ row }) => (
          <span>{row.original.totalRecipients}</span>
        ),
        size: 110,
        meta: { headerTitle: 'Recipients', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'readCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Read" />,
        cell: ({ row }) => {
          const { readCount, totalRecipients } = row.original;
          const allRead = readCount === totalRecipients;
          return (
            <Badge variant={allRead ? 'primary' : 'secondary'}>
              {readCount} / {totalRecipients}
            </Badge>
          );
        },
        size: 110,
        meta: { headerTitle: 'Read', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: 'View',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewRecipients(row.original);
            }}
          >
            <Eye size={16} />
          </Button>
        ),
        size: 70,
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: broadcasts,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
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
          <ToolbarPageTitle>Announcements</ToolbarPageTitle>
          <ToolbarDescription>
            Send and track mandatory-read announcements for your team
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={() => setSendDialogOpen(true)}>
            <Plus size={16} className="me-1" />
            Send New
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6">
        {loading ? (
          <div className="bg-card rounded-lg border p-6">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-card rounded-lg border">
            <div className="text-center py-12 text-muted-foreground">
              No announcements sent yet. Click "Send New" to create your first announcement.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={table.getFilteredRowModel().rows.length}
                onRowClick={handleViewRecipients}
                tableLayout={{
                  columnsResizable: true,
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
                tableClassNames={{
                  bodyRow: 'cursor-pointer hover:bg-muted/50',
                }}
              >
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          </div>
        )}
      </div>

      <SendAnnouncementDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onSuccess={handleSendSuccess}
      />

      <RecipientsDialog
        open={recipientsDialogOpen}
        onOpenChange={setRecipientsDialogOpen}
        broadcast={selectedBroadcast}
      />
    </div>
  );
}
