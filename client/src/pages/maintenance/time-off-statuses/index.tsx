import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { TimeOffStatusDTO, CreateTimeOffStatusDTO, UpdateTimeOffStatusDTO } from '@shared/dto';
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
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
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
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { TimeOffStatusFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/pages/reports/components/ExportButton';

export function TimeOffStatusesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TimeOffStatusDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState<TimeOffStatusDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const statuses = useEntityList<TimeOffStatusDTO, CreateTimeOffStatusDTO, UpdateTimeOffStatusDTO>({
    endpoint: '/api/time-off-statuses',
    idKey: 'statusId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' }),
  });

  const handleEdit = (status: TimeOffStatusDTO) => {
    setEditingStatus(status);
    setFormOpen(true);
  };

  const handleDeleteClick = (status: TimeOffStatusDTO) => {
    setDeletingStatus(status);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<TimeOffStatusDTO>[]>(
    () => [
      {
        accessorKey: 'statusId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.statusId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status Name" />,
        cell: ({ row }) => row.original.statusName,
        size: 300,
        meta: { headerTitle: 'Status Name', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        accessorKey: 'statusShortName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Short Name" />,
        cell: ({ row }) => row.original.statusShortName ?? '-',
        size: 150,
        meta: { headerTitle: 'Short Name', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('TimeOffStatuses') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('TimeOffStatuses') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: statuses.items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    statuses.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingStatus(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStatus) return;
    try {
      await statuses.deleteItem(deletingStatus.statusId);
      setDeleteDialogOpen(false);
      setDeletingStatus(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingStatus(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingStatus(undefined);
    statuses.loadItems();
  };

  if (!canRead('TimeOffStatuses')) {
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
          <ToolbarPageTitle>Time Off Statuses</ToolbarPageTitle>
          <ToolbarDescription>Manage time off status catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <ExportButton
            searchParams={new URLSearchParams()}
            baseEndpoint="/api/time-off-statuses"
            filenamePrefix="time-off-statuses"
          />
          {canCreate('TimeOffStatuses') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Status
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search statuses..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={statuses.items.length}
          isLoading={statuses.loading}
          emptyMessage="No statuses found. Create your first status to get started."
          tableLayout={{
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <TimeOffStatusFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        status={editingStatus}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the status "{deletingStatus?.statusName}".
              This action cannot be undone.
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
