import { useEffect, useMemo, useState } from 'react';
import { Pencil, PowerOff, RefreshCw, X } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
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
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPools, deactivatePool, type GiftCardPoolDTO } from '@/services/giftCardPool';
import { PoolFormDialog } from './PoolFormDialog';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export function GiftCardPoolsPage() {
  const [pools, setPools] = useState<GiftCardPoolDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<GiftCardPoolDTO | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<GiftCardPoolDTO | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadPools = async () => {
    setLoading(true);
    try {
      const data = await getPools();
      setPools(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load pools',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPools(); }, []);

  const handleEdit = (pool: GiftCardPoolDTO) => {
    setSelectedPool(pool);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedPool(null);
    setFormOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivatePool(deactivateTarget.poolId);
      toast({ title: 'Deactivated', description: `Pool "${deactivateTarget.poolName}" deactivated.` });
      setDeactivateTarget(null);
      loadPools();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to deactivate pool',
        variant: 'destructive',
      });
    } finally {
      setDeactivating(false);
    }
  };

  const columns = useMemo<ColumnDef<GiftCardPoolDTO>[]>(
    () => [
      {
        accessorKey: 'poolId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'poolCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        size: 120,
        meta: { headerTitle: 'Code', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'poolName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 260,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'poolIsActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.poolIsActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary" className="opacity-60">Inactive</Badge>
          ),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(String(row.original.poolIsActive)),
        size: 100,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {canCreate('GiftCardCatalog') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={15} className="me-1" /> Edit
              </Button>
            )}
            {canDelete('GiftCardCatalog') && row.original.poolIsActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeactivateTarget(row.original)}
              >
                <PowerOff size={15} className="me-1" /> Deactivate
              </Button>
            )}
          </div>
        ),
        size: 160,
        enableSorting: false,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-8 w-24" /> },
      },
    ],
    [pools],
  );

  const table = useReactTable({
    data: pools,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('GiftCardCatalog')) {
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
          <ToolbarPageTitle>Gift Card Pools</ToolbarPageTitle>
          <ToolbarDescription>Manage cost-center pools for gift card distribution</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadPools} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate('GiftCardCatalog') && (
            <Button onClick={handleAdd}>+ Add Pool</Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <DataGridColumnFilter
          column={table.getColumn('poolIsActive')}
          title="Status"
          options={STATUS_OPTIONS}
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
          emptyMessage="No pools found."
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

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.poolName}</strong>?
              The record will remain visible but will no longer be available for selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateConfirm} disabled={deactivating}>
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PoolFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadPools}
        pool={selectedPool}
      />
    </div>
  );
}