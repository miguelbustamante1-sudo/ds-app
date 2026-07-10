import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import { formatUTCDate } from '@/lib/utils';
import { listAllProcedures, deactivateProcedure } from './api';
import { RegisterDialog } from './form';
import type { StoredProcedureDTO } from '@shared/dto/StoredProcedure';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function statusBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="success" appearance="light">Active</Badge>
    : <Badge variant="destructive" appearance="light">Inactive</Badge>;
}

export function AdminStoredProceduresPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canRead } = usePermissions();
  const isAdmin = !!user?.roles.includes('admin') && canRead('StoredProcedureRun');

  const [procedures, setProcedures] = useState<StoredProcedureDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StoredProcedureDTO | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StoredProcedureDTO | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllProcedures();
      setProcedures(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load procedures';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      void loadProcedures();
    }
  }, [isAdmin, loadProcedures]);

  const handleDeactivateConfirm = useCallback(async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateProcedure(deactivateTarget.spId);
      toast({ title: 'Success', description: 'Procedure deactivated' });
      setProcedures((prev) =>
        prev.map((p) => (p.spId === deactivateTarget.spId ? { ...p, spActive: false } : p)),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate procedure';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeactivating(false);
      setDeactivateTarget(null);
    }
  }, [deactivateTarget, toast]);

  const schemaOptions = useMemo(() => {
    const unique = new Set(procedures.map((p) => p.spSchema));
    return Array.from(unique).map((s) => ({ label: s, value: s }));
  }, [procedures]);

  const columns = useMemo<ColumnDef<StoredProcedureDTO>[]>(
    () => [
      {
        accessorKey: 'spLabel',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 220,
      },
      {
        accessorKey: 'spSchema',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Schema" />,
        filterFn: (row, _id, filterValues: string[]) =>
          filterValues.length === 0 || filterValues.includes(row.original.spSchema),
        size: 100,
      },
      {
        accessorKey: 'spName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Procedure Name" />,
        size: 220,
      },
      {
        id: 'status',
        accessorFn: (row) => (row.spActive ? 'active' : 'inactive'),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => statusBadge(row.original.spActive),
        filterFn: (row, _id, filterValues: string[]) =>
          filterValues.length === 0 || filterValues.includes(row.original.spActive ? 'active' : 'inactive'),
        size: 110,
      },
      {
        accessorKey: 'spCreatedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => formatUTCDate(row.original.spCreatedAt),
        size: 130,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingRecord(row.original);
                setDialogOpen(true);
              }}
            >
              <Pencil size={16} />
            </Button>
            {row.original.spActive && (
              <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: procedures,
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

  const isFiltered = columnFilters.length > 0;

  if (!isAdmin) {
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
          <ToolbarPageTitle>Stored Procedure Registry</ToolbarPageTitle>
          <ToolbarDescription>Register and manage stored procedures available to the run wizard</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button
            onClick={() => {
              setEditingRecord(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} className="me-1" />
            Register Procedure
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('spSchema') && (
          <DataGridColumnFilter column={table.getColumn('spSchema')} title="Schema" options={schemaOptions} />
        )}
        {table.getColumn('status') && (
          <DataGridColumnFilter column={table.getColumn('status')} title="Status" options={STATUS_OPTIONS} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={procedures.length}
          isLoading={loading}
          emptyMessage="No procedures registered yet."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <RegisterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        onSuccess={(record) => {
          setDialogOpen(false);
          setEditingRecord(null);
          setProcedures((prev) => {
            const exists = prev.some((p) => p.spId === record.spId);
            return exists ? prev.map((p) => (p.spId === record.spId ? record : p)) : [...prev, record];
          });
        }}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate procedure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget &&
                `This will deactivate "${deactivateTarget.spLabel}". It will no longer appear in the run wizard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeactivateConfirm()} disabled={deactivating}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
