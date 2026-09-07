import { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
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
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getShifts, getShift, deleteShift, type ShiftDTO } from '@/services/shift';
import { ShiftEditDialog } from './ShiftEditDialog';
import { ShiftCreateDialog } from './ShiftCreateDialog';

// --- Page component -----------------------------------------------------------

export function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShiftDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { canRead } = usePermissions();

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to load shifts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleRowClick = async (shift: ShiftDTO) => {
    try {
      const fresh = await getShift(shift.shiftId);
      setSelectedShift(fresh);
    } catch {
      setSelectedShift(shift);
    }
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadShifts();
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
        size: 300,
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
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRowClick(row.original)}
            >
              <Pencil size={15} className="me-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        ),
        size: 80,
        enableSorting: false,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-8 w-14" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: shifts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
          <Button variant="outline" onClick={loadShifts} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            + Add Shift
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shifts..."
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
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
