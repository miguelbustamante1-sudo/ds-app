import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { RegionDTO, CreateRegionDTO, UpdateRegionDTO } from '@shared/dto';
import {
  ColumnDef,
  ColumnFiltersState,
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
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { RegionFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function RegionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRegion, setDeletingRegion] = useState<RegionDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [nameFilter, setNameFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const regions = useEntityList<RegionDTO, CreateRegionDTO, UpdateRegionDTO>({
    endpoint: '/api/regions',
    idKey: 'regionId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    regions.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingRegion(undefined);
    setFormOpen(true);
  };

  const handleEdit = (region: RegionDTO) => {
    setEditingRegion(region);
    setFormOpen(true);
  };

  const handleDeleteClick = (region: RegionDTO) => {
    setDeletingRegion(region);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRegion) return;
    try {
      await regions.deleteItem(deletingRegion.regionId);
      setDeleteDialogOpen(false);
      setDeletingRegion(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingRegion(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRegion(undefined);
    regions.loadItems();
  };

  const columns = useMemo<ColumnDef<RegionDTO>[]>(
    () => [
      {
        accessorKey: 'regionId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.regionId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'regionName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.regionName,
        filterFn: (row, _id, value: string) =>
          row.original.regionName.toLowerCase().includes(value.toLowerCase()),
        size: 300,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Regions') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('Regions') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-20 ml-auto" />,
        },
      },
    ],
    [canCreate, canDelete]
  );

  const table = useReactTable({
    data: regions.items,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isFiltered = columnFilters.length > 0 || nameFilter !== '';

  const handleNameFilterChange = (value: string) => {
    setNameFilter(value);
    table.getColumn('regionName')?.setFilterValue(value);
  };

  const handleReset = () => {
    setNameFilter('');
    table.resetColumnFilters();
  };

  if (!canRead('Regions')) {
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
          <ToolbarPageTitle>Regions</ToolbarPageTitle>
          <ToolbarDescription>Manage regions catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Regions') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Region
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search by name..."
          value={nameFilter}
          onChange={(e) => handleNameFilterChange(e.target.value)}
          className="h-8 w-[200px]"
        />
        {isFiltered && (
          <Button variant="ghost" onClick={handleReset} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={regions.items.length}
          isLoading={regions.loading}
          emptyMessage="No regions found. Create your first region to get started."
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

      <RegionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        region={editingRegion}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the region "{deletingRegion?.regionName}".
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
