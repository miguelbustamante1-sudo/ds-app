import { useEffect, useMemo, useState } from 'react';
import { Pencil, Power, PowerOff, RefreshCw, X } from 'lucide-react';
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
import { getReasons, deactivateReason, activateReason, type GiftCardReasonDTO } from '@/services/giftCardReason';
import { ReasonFormDialog } from './ReasonFormDialog';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export function GiftCardReasonsPage() {
  const [reasons, setReasons] = useState<GiftCardReasonDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<GiftCardReasonDTO | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<GiftCardReasonDTO | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadReasons = async () => {
    setLoading(true);
    try {
      const data = await getReasons();
      setReasons(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load reasons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReasons(); }, []);

  const handleEdit = (reason: GiftCardReasonDTO) => {
    setSelectedReason(reason);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedReason(null);
    setFormOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateReason(deactivateTarget.reasonId);
      toast({ title: 'Deactivated', description: `Reason "${deactivateTarget.reasonName}" deactivated.` });
      setDeactivateTarget(null);
      loadReasons();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to deactivate reason',
        variant: 'destructive',
      });
    } finally {
      setDeactivating(false);
    }
  };

  const handleActivate = async (reason: GiftCardReasonDTO) => {
    try {
      await activateReason(reason.reasonId);
      toast({ title: 'Activated', description: `Reason "${reason.reasonName}" activated.` });
      loadReasons();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to activate reason',
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<GiftCardReasonDTO>[]>(
    () => [
      {
        accessorKey: 'reasonId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'reasonName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 300,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'reasonIsActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.reasonIsActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary" className="opacity-60">Inactive</Badge>
          ),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(String(row.original.reasonIsActive)),
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
            {canDelete('GiftCardCatalog') && row.original.reasonIsActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeactivateTarget(row.original)}
              >
                <PowerOff size={15} className="me-1" /> Deactivate
              </Button>
            )}
            {canCreate('GiftCardCatalog') && !row.original.reasonIsActive && (
              <Button variant="ghost" size="sm" onClick={() => handleActivate(row.original)}>
                <Power size={15} className="me-1" /> Activate
              </Button>
            )}
          </div>
        ),
        size: 200,
        enableSorting: false,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-8 w-24" /> },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: reasons,
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
          <ToolbarPageTitle>Gift Card Reasons</ToolbarPageTitle>
          <ToolbarDescription>Manage reasons for gift card distribution</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadReasons} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate('GiftCardCatalog') && (
            <Button onClick={handleAdd}>+ Add Reason</Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <DataGridColumnFilter
          column={table.getColumn('reasonIsActive')}
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
          recordCount={reasons.length}
          isLoading={loading}
          emptyMessage="No reasons found."
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
            <AlertDialogTitle>Deactivate Reason</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.reasonName}</strong>?
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

      <ReasonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadReasons}
        reason={selectedReason}
      />
    </div>
  );
}