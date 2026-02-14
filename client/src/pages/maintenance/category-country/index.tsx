import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type {
  CategoryCountryDTO,
  CreateCategoryCountryDTO,
  UpdateCategoryCountryDTO,
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
import { useEntityList } from '@/hooks/use-entity-list';
import { CategoryCountryFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function CategoryCountryPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryCountryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CategoryCountryDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const entities = useEntityList<CategoryCountryDTO, CreateCategoryCountryDTO, UpdateCategoryCountryDTO>({
    endpoint: '/api/time-off-categories-by-country',
    idKey: 'categoryCountryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (item: CategoryCountryDTO) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (item: CategoryCountryDTO) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<CategoryCountryDTO>[]>(
    () => [
      {
        accessorKey: 'categoryCountryId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.categoryCountryId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        size: 180,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        size: 150,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'categoryCountryStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              row.original.categoryCountryStatus === 1
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {row.original.categoryCountryStatus === 1 ? 'Active' : 'Inactive'}
          </span>
        ),
        size: 100,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'categoryCountryAllowHalfDay',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Allow Half Day" />,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              row.original.categoryCountryAllowHalfDay
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {row.original.categoryCountryAllowHalfDay ? 'Yes' : 'No'}
          </span>
        ),
        size: 130,
        meta: { headerTitle: 'Allow Half Day', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'categoryCountryIsFixedDuration',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Fixed Duration" />,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              row.original.categoryCountryIsFixedDuration
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {row.original.categoryCountryIsFixedDuration ? 'Yes' : 'No'}
          </span>
        ),
        size: 130,
        meta: { headerTitle: 'Fixed Duration', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'categoryCountryFixedDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Fixed Days" />,
        cell: ({ row }) => row.original.categoryCountryFixedDays ?? '-',
        size: 100,
        meta: { headerTitle: 'Fixed Days', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'categoryCountryIsCalendar',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Calendar Days" />,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              row.original.categoryCountryIsCalendar
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            {row.original.categoryCountryIsCalendar ? 'Yes' : 'No'}
          </span>
        ),
        size: 130,
        meta: { headerTitle: 'Calendar Days', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: entities.items,
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
    entities.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingItem(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      await entities.deleteItem(deletingItem.categoryCountryId);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingItem(undefined);
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Categories by Country</ToolbarPageTitle>
          <ToolbarDescription>Manage time-off category settings per country</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            New Category by Country
          </Button>
        </ToolbarActions>
      </Toolbar>

      {/* Search Input */}
      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories by country..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={entities.loading}
          emptyMessage="No category-country records found. Create your first entry to get started."
          tableLayout={{
            width: 'fixed',
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <CategoryCountryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category-country record for "{deletingItem?.categoryName}" in "{deletingItem?.countryName}".
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
