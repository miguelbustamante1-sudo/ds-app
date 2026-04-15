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
import type { PersistenceTemplateDTO } from '@shared/dto/PersistenceTemplate';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPersistenceTemplates, deletePersistenceTemplate } from '@/services/persistenceTemplate';
import { formatUTCDate } from '@/lib/utils';
import { PersistenceTemplateFormDialog } from './form';
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

export function TemplateBuilderPage() {
  const [templates, setTemplates] = useState<PersistenceTemplateDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PersistenceTemplateDTO | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PersistenceTemplateDTO | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getPersistenceTemplates();
      setTemplates(data);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load persistence templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setFormOpen(true);
  };

  const handleEdit = (template: PersistenceTemplateDTO) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingTemplate(undefined);
    loadTemplates();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePersistenceTemplate(deleteTarget.id);
      toast({ title: 'Success', description: `"${deleteTarget.name}" deleted successfully` });
      setDeleteTarget(undefined);
      loadTemplates();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete persistence template',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<PersistenceTemplateDTO>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 240,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'targetTable',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Target Table" />,
        cell: ({ row }) => row.original.targetTable ?? '-',
        size: 200,
        meta: { headerTitle: 'Target Table', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Author" />,
        cell: ({ row }) => row.original.createdBy ?? '-',
        size: 200,
        meta: { headerTitle: 'Author', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date Created" />,
        cell: ({ row }) => (row.original.createdAt ? formatUTCDate(row.original.createdAt) : '-'),
        size: 160,
        meta: { headerTitle: 'Date Created', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date Modified" />,
        cell: ({ row }) => (row.original.updatedAt ? formatUTCDate(row.original.updatedAt) : '-'),
        size: 160,
        meta: { headerTitle: 'Date Modified', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('PersistenceTemplates') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 size={16} />
                </Button>
              </>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-24 ml-auto" />,
        },
      },
    ],
    [canCreate],
  );

  const table = useReactTable({
    data: templates,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('PersistenceTemplates')) {
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
          <ToolbarPageTitle>Persistence Templates</ToolbarPageTitle>
          <ToolbarDescription>Manage data persistence templates</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('PersistenceTemplates') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Template
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
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
          emptyMessage="No persistence templates found. Create your first template to get started."
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

      <PersistenceTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Persistence Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone and will also remove all associated columns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
