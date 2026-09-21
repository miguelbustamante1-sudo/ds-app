import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { TimeOffCategoryDTO, CreateTimeOffCategoryDTO, UpdateTimeOffCategoryDTO } from '@shared/dto';
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
import { TimeOffTypeFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/pages/reports/components/ExportButton';

export function TimeOffTypesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<TimeOffCategoryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<TimeOffCategoryDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const timeOffTypes = useEntityList<TimeOffCategoryDTO, CreateTimeOffCategoryDTO, UpdateTimeOffCategoryDTO>({
    endpoint: '/api/time-off-category',
    idKey: 'categoryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (type: TimeOffCategoryDTO) => {
    setEditingType(type);
    setFormOpen(true);
  };

  const handleDeleteClick = (type: TimeOffCategoryDTO) => {
    setDeletingType(type);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<TimeOffCategoryDTO>[]>(
    () => [
      {
        accessorKey: 'categoryId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.categoryId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.categoryName,
        size: 300,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        accessorKey: 'categoryShortName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Short Name" />,
        cell: ({ row }) => row.original.categoryShortName ?? '-',
        size: 150,
        meta: { headerTitle: 'Short Name', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('TimeOffCategories') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('TimeOffCategories') && (
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
    data: timeOffTypes.items,
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
    timeOffTypes.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingType(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;

    try {
      await timeOffTypes.deleteItem(deletingType.categoryId);
      setDeleteDialogOpen(false);
      setDeletingType(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingType(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingType(undefined);
    timeOffTypes.loadItems();
  };

  if (!canRead('TimeOffCategories')) {
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
          <ToolbarPageTitle>Type of TimeOff</ToolbarPageTitle>
          <ToolbarDescription>Manage time off type catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <ExportButton
            searchParams={new URLSearchParams()}
            baseEndpoint="/api/time-off-category"
            filenamePrefix="time-off-types"
          />
          {canCreate('TimeOffCategories') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Type
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search types..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={timeOffTypes.items.length}
          isLoading={timeOffTypes.loading}
          emptyMessage="No time off types found. Create your first type to get started."
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

      <TimeOffTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        timeOffType={editingType}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the time off type "{deletingType?.categoryName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
