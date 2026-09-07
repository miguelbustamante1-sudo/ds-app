import { useEffect, useState, useMemo, useCallback } from 'react';
import type { SortingState, ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SentBroadcastDTO, BroadcastRecipientDTO } from '@shared/dto/Notification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { format } from 'date-fns';

interface RecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broadcast: SentBroadcastDTO | null;
}

export function RecipientsDialog({
  open,
  onOpenChange,
  broadcast,
}: RecipientsDialogProps) {
  const { toast } = useToast();

  const [recipients, setRecipients] = useState<BroadcastRecipientDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const loadRecipients = useCallback(async (notificationId: number) => {
    try {
      setLoading(true);
      const data = await apiGet<BroadcastRecipientDTO[]>(
        `/api/notifications/broadcast/${notificationId}/recipients`
      );
      setRecipients(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load recipients';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open && broadcast) {
      setGlobalFilter('');
      loadRecipients(broadcast.notificationId);
    } else {
      setRecipients([]);
    }
  }, [open, broadcast]);

  const columns = useMemo<ColumnDef<BroadcastRecipientDTO>[]>(
    () => [
      {
        accessorKey: 'userName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.userName}</span>
        ),
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'isRead',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Read Status" />,
        cell: ({ row }) => (
          <Badge variant={row.original.isRead ? 'primary' : 'secondary'}>
            {row.original.isRead ? 'Read' : 'Unread'}
          </Badge>
        ),
        size: 120,
        meta: { headerTitle: 'Read Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'readAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Read At" />,
        cell: ({ row }) => (
          <span>
            {row.original.readAt
              ? format(new Date(row.original.readAt), 'dd-MMM-yyyy HH:mm')
              : '-'}
          </span>
        ),
        size: 180,
        meta: { headerTitle: 'Read At', skeleton: <Skeleton className="h-4 w-28" /> },
      },
    ],
    []
  );

  const table = useReactTable({
    data: recipients,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{broadcast?.title ?? 'Recipients'}</DialogTitle>
          <DialogDescription>
            {broadcast?.text ?? 'View which team members have read this announcement.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recipients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recipients found.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipients..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={table.getFilteredRowModel().rows.length}
                tableLayout={{
                  columnsResizable: true,
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
              >
                <DataGridTable />
                <DataGridPagination sizes={[10, 25]} />
              </DataGrid>
            </DataGridContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
