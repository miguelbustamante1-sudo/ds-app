import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiGet, apiDelete } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { MondayConnectionDTO, MondaySyncStatus } from '@shared/dto';
import { ConnectionDialog } from './ConnectionDialog';
import { FieldMappingDialog } from './FieldMappingDialog';
import { SyncNowDialog } from './SyncNowDialog';
import { BackToHubButton } from '@/components/BackToHubButton';

function syncStatusBadge(status: MondaySyncStatus | null) {
  if (status === 'SUCCESS') return <Badge variant="success" appearance="light">Success</Badge>;
  if (status === 'PARTIAL') return <Badge variant="warning" appearance="light">Partial</Badge>;
  if (status === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  return <Badge variant="outline">Never synced</Badge>;
}

// mcdLastSyncedDate is a real timestamp (syncs run every 6h), not a UTC-midnight date, so
// formatUTCDate/parseUTCDateAsLocal (built for date-only values) would silently drop the time
// and make same-day syncs indistinguishable. Deliberate exception to the frontend date-utility
// rule for this one field — flagged in the Monday integration design spec.
function formatSyncTimestamp(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function MondayConnectionsAdminPage() {
  const { canRead, canCreate, canDelete } = usePermissions();
  const { toast } = useToast();

  const [connections, setConnections] = useState<MondayConnectionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<MondayConnectionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MondayConnectionDTO | null>(null);
  const [mappingTarget, setMappingTarget] = useState<MondayConnectionDTO | null>(null);
  const [syncTarget, setSyncTarget] = useState<MondayConnectionDTO | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<MondayConnectionDTO[]>('/api/monday-connections');
      setConnections(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load connections';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/monday-connections/${deleteTarget.mcdId}`);
      toast({ title: 'Success', description: 'Connection deleted' });
      setDeleteTarget(null);
      void loadConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete connection';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<MondayConnectionDTO>[]>(
    () => [
      {
        accessorKey: 'mcdName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'mcdBoardName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Board" />,
        cell: ({ row }) => row.original.mcdBoardName ?? row.original.mcdBoardId,
        size: 200,
        meta: { headerTitle: 'Board', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'mcdIsActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) =>
          row.original.mcdIsActive ? (
            <Badge variant="success" appearance="light">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
        size: 100,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-5 w-16" /> },
      },
      {
        accessorKey: 'mcdLastSyncedDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Last Synced" />,
        cell: ({ row }) => formatSyncTimestamp(row.original.mcdLastSyncedDate),
        size: 180,
        meta: { headerTitle: 'Last Synced', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'syncStatus',
        header: 'Last Sync',
        cell: ({ row }) => syncStatusBadge(row.original.mcdLastSyncStatus),
        size: 130,
        meta: { skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const connection = row.original;
          return (
            <div className="flex justify-end gap-2">
              {canCreate('StandaloneTaskAdmin') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMappingTarget(connection)}
                  >
                    Map Fields
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSyncTarget(connection)}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingConnection(connection);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
              {canDelete('StandaloneTaskAdmin') && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(connection)}>
                  Delete
                </Button>
              )}
            </div>
          );
        },
        size: 320,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-32 ml-auto" />,
        },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: connections,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('StandaloneTaskAdmin')) {
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
          <ToolbarPageTitle>Monday Connections</ToolbarPageTitle>
          <ToolbarDescription>
            Connect Monday.com boards to pull items in as standalone tasks.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('StandaloneTaskAdmin') && (
            <Button
              onClick={() => {
                setEditingConnection(null);
                setDialogOpen(true);
              }}
            >
              New Connection
            </Button>
          )}
          <BackToHubButton hubPath="/tasks-hub" />
        </ToolbarActions>
      </Toolbar>

      <DataGridContainer className="mt-6">
        <DataGrid
          table={table}
          recordCount={connections.length}
          isLoading={loading}
          emptyMessage="No Monday connections yet."
          tableLayout={{ columnsResizable: true, columnsMovable: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSaved={(saved) => {
          setDialogOpen(false);
          const wasCreate = editingConnection === null;
          void loadConnections();
          if (wasCreate) setMappingTarget(saved);
        }}
      />

      <FieldMappingDialog
        open={mappingTarget !== null}
        onOpenChange={(open) => !open && setMappingTarget(null)}
        connection={mappingTarget}
        onSaved={() => {
          setMappingTarget(null);
          void loadConnections();
        }}
      />

      <SyncNowDialog
        open={syncTarget !== null}
        onOpenChange={(open) => !open && setSyncTarget(null)}
        connection={syncTarget}
        onSynced={() => {
          setSyncTarget(null);
          void loadConnections();
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteTarget?.mcdName}" and stops any further syncing from its board.
              Tasks already created from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
