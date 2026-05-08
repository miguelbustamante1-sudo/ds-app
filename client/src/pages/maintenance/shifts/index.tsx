import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
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
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getShifts, getShift, deleteShift, type ShiftDTO } from '@/services/shift';
import { ShiftEditDialog } from './ShiftEditDialog';
import { ShiftCreateDialog } from './ShiftCreateDialog';

export function ShiftsPage() {
  const [shifts, setShifts]                 = useState<ShiftDTO[]>([]);
  const [loading, setLoading]               = useState(false);
  const [sorting, setSorting]               = useState<SortingState>([]);
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>([]);
  const [selectedShift, setSelectedShift]   = useState<ShiftDTO | null>(null);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<ShiftDTO | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const { toast }                           = useToast();
  const { canRead, canCreate, canDelete }   = usePermissions();

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load shifts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, []);

  const handleEditClick = async (shift: ShiftDTO) => {
    try {
      const fresh = await getShift(shift.shiftId);
      setSelectedShift(fresh);
    } catch {
      setSelectedShift(shift);
    }
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShift(deleteTarget.shiftId);
      toast({ title: 'Deleted', description: `Shift "${deleteTarget.description}" was deleted.` });
      setDeleteTarget(null);
      loadShifts();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete shift',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<ShiftDTO>[]>(
    () => [
      {
        accessorKey: 'shiftId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        filterFn: 'includesString',
        size: 320,
        meta: { headerTitle: 'Description', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        accessorKey: 'totalWeekHours',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Total Week Hours" />,
        cell: ({ row }) => `${row.original.totalWeekHours} h`,
        size: 160,
        meta: { headerTitle: 'Total Week Hours', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Shift') && (
              <Button variant="ghost" size="sm" onClick={() => handleEditClick(row.original)}>
                <Pencil size={15} />
              </Button>
            )}
            {canDelete('Shift') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 size={15} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 80,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-14 ml-auto" /> },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: shifts,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  if (!canRead('Shift')) {
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
          <ToolbarPageTitle>Shifts</ToolbarPageTitle>
          <ToolbarDescription>View and manage work shifts</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Shift') && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} className="me-1" />
              Add Shift
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search description..."
          value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('description')?.setFilterValue(e.target.value)}
          className="h-8 w-[220px]"
        />
        {columnFilters.length > 0 && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No shifts found."
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.description}</strong>? This
              action cannot be undone and will also remove all associated day details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShiftCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadShifts}
      />

      <ShiftEditDialog
        shift={selectedShift}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadShifts}
      />
    </div>
  );
}
