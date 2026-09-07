import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type { OptionDTO } from '@shared/dto';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getOptions, deleteOption } from '@/services/security';
import { formatUTCDate } from '@/lib/utils';
import { OptionFormDialog } from './form';

export function OptionsPage() {
  const [options, setOptions] = useState<OptionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<OptionDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOption, setDeletingOption] = useState<OptionDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadOptions = async () => {
    setLoading(true);
    try {
      const data = await getOptions();
      setOptions(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleCreate = () => {
    setEditingOption(undefined);
    setFormOpen(true);
  };

  const handleEdit = (option: OptionDTO) => {
    setEditingOption(option);
    setFormOpen(true);
  };

  const handleDeleteClick = (option: OptionDTO) => {
    setDeletingOption(option);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOption) return;
    try {
      await deleteOption(deletingOption.optionId);
      toast({ title: 'Success', description: 'Resource deleted successfully' });
      setDeleteDialogOpen(false);
      setDeletingOption(null);
      await loadOptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete resource',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setDeletingOption(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingOption(undefined);
    loadOptions();
  };

  const columns = useMemo<ColumnDef<OptionDTO>[]>(
    () => [
      {
        accessorKey: 'optionId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.optionId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'optionDescription',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Resource Key" />,
        cell: ({ row }) => row.original.optionDescription ?? '-',
        size: 280,
        meta: { headerTitle: 'Resource Key', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'optionCreatedBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created By" />,
        cell: ({ row }) => row.original.optionCreatedBy ?? '-',
        size: 220,
        meta: { headerTitle: 'Created By', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'optionCreatedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created At" />,
        cell: ({ row }) =>
          row.original.optionCreatedAt ? formatUTCDate(row.original.optionCreatedAt) : '-',
        size: 150,
        meta: { headerTitle: 'Created At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('RBACOptions') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('RBACOptions') && (
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
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: options,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('RBACOptions')) {
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
          <ToolbarPageTitle>Resources</ToolbarPageTitle>
          <ToolbarDescription>Manage RBAC permission resources</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('RBACOptions') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Resource
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No resources found. Create your first resource to get started."
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

      <OptionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        option={editingOption}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the resource "{deletingOption?.optionDescription}". This
              action cannot be undone.
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
