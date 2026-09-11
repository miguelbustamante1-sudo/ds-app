import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type {
  ApiPermissionCatalogDTO,
  CreatePermissionCatalogEntryDTO,
  UpdatePermissionCatalogEntryDTO,
} from '@shared/dto';
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
import { Badge } from '@/components/ui/badge';
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
import { BackToHubButton } from '@/components/BackToHubButton';
import { PermissionCatalogFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function PermissionCatalogPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApiPermissionCatalogDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ApiPermissionCatalogDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const records = useEntityList<ApiPermissionCatalogDTO, CreatePermissionCatalogEntryDTO, UpdatePermissionCatalogEntryDTO>({
    endpoint: '/api/admin/api-keys/permission-catalog',
    idKey: 'apcId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' }),
  });

  const handleEdit = (record: ApiPermissionCatalogDTO) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDeleteClick = (record: ApiPermissionCatalogDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<ApiPermissionCatalogDTO>[]>(
    () => [
      {
        accessorKey: 'apcResource',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Resource" />,
        cell: ({ row }) => <span className="font-medium">{row.original.apcResource}</span>,
        size: 220,
        meta: { headerTitle: 'Resource', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'apcAction',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Action" />,
        cell: ({ row }) => <span className="capitalize">{row.original.apcAction}</span>,
        size: 120,
        meta: { headerTitle: 'Action', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'apcLabel',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Label" />,
        cell: ({ row }) => row.original.apcLabel,
        size: 320,
        meta: { headerTitle: 'Label', skeleton: <Skeleton className="h-4 w-56" /> },
      },
      {
        accessorKey: 'apcIsActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.apcIsActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('RBACApiKeys') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('RBACApiKeys') && row.original.apcIsActive && (
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
    data: records.items,
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
    records.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await records.deleteItem(deletingRecord.apcId);
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
    records.loadItems();
  };

  if (!canRead('RBACApiKeys')) {
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
          <ToolbarPageTitle>API Permission Catalog</ToolbarPageTitle>
          <ToolbarDescription>
            Manage the resource/action pairs that can be granted to external API keys
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('RBACApiKeys') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Permission
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      {records.loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer className="mt-4">
          <DataGrid
            table={table}
            recordCount={records.items.length}
            emptyMessage="No permission catalog entries found. Create your first one to get started."
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
      )}

      <PermissionCatalogFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate "{deletingRecord?.apcResource}.{deletingRecord?.apcAction}".
              It will no longer be grantable to API keys, but existing keys already holding it keep it until revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6">
        <BackToHubButton hubPath="/maintenance-hub" />
      </div>
    </div>
  );
}

export default PermissionCatalogPage;
