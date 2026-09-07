import { useEffect, useMemo, useState } from 'react';
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
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getCardValues, deactivateCardValue, activateCardValue } from '@/services/giftCardValue';
import { CardValueFormDialog } from './CardValueFormDialog';
import type { GiftCardValueDTO } from '@shared/dto/GiftCardValue';
import { Plus, Pencil, Power, PowerOff } from 'lucide-react';

export function GiftCardValuesPage() {
  const [values, setValues]               = useState<GiftCardValueDTO[]>([]);
  const [loading, setLoading]             = useState(false);
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedValue, setSelectedValue] = useState<GiftCardValueDTO | null>(null);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const { toast }                         = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadValues = async () => {
    setLoading(true);
    try {
      const data = await getCardValues();
      setValues(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to load card values', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadValues(); }, []);

  const handleDeactivate = async (value: GiftCardValueDTO) => {
    try {
      await deactivateCardValue(value.cardValueId);
      toast({ title: 'Deactivated', description: `Card value deactivated successfully` });
      loadValues();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to deactivate', variant: 'destructive' });
    }
  };

  const handleActivate = async (value: GiftCardValueDTO) => {
    try {
      await activateCardValue(value.cardValueId);
      toast({ title: 'Activated', description: `Card value activated successfully` });
      loadValues();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to activate', variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<GiftCardValueDTO>[]>(() => [
    {
      accessorKey: 'cardValueId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
      size: 70,
      meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
    },
    {
      accessorKey: 'cardTypeName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Card Type" />,
      size: 200,
      meta: { headerTitle: 'Card Type', skeleton: <Skeleton className="h-4 w-32" /> },
    },
    {
      accessorKey: 'cardValueAmount',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => `${row.original.cardValueCurrency} ${Number(row.original.cardValueAmount).toFixed(2)}`,
      size: 150,
      meta: { headerTitle: 'Amount', skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: 'cardValueCurrency',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Currency" />,
      size: 100,
      meta: { headerTitle: 'Currency', skeleton: <Skeleton className="h-4 w-16" /> },
    },
    {
      accessorKey: 'cardValueIsActive',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      cell: ({ row }) => row.original.cardValueIsActive
        ? <Badge variant="success">Active</Badge>
        : <Badge variant="secondary" className="opacity-50">Inactive</Badge>,
      size: 100,
      meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      filterFn: (row, _id, value) => {
        if (!value || value.length === 0) return true;
        return value.includes(String(row.original.cardValueIsActive));
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {canCreate('GiftCardCatalog') && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedValue(row.original); setDialogOpen(true); }}>
              <Pencil size={15} className="me-1" /> Edit
            </Button>
          )}
          {canDelete('GiftCardCatalog') && row.original.cardValueIsActive && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeactivate(row.original)}>
              <PowerOff size={15} className="me-1" /> Deactivate
            </Button>
          )}
          {canCreate('GiftCardCatalog') && !row.original.cardValueIsActive && (
            <Button variant="ghost" size="sm" onClick={() => handleActivate(row.original)}>
              <Power size={15} className="me-1" /> Activate
            </Button>
          )}
        </div>
      ),
      size: 200,
      enableSorting: false,
      meta: { skeleton: <Skeleton className="h-8 w-28 ml-auto" /> },
    },
  ], [canCreate, canDelete]);

  const table = useReactTable({
    data: values,
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
          <ToolbarPageTitle>Gift Card Values</ToolbarPageTitle>
          <ToolbarDescription>Manage monetary denominations per provider</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadValues}>
            Refresh
          </Button>
          {canCreate('GiftCardCatalog') && (
            <Button onClick={() => { setSelectedValue(null); setDialogOpen(true); }}>
              <Plus size={16} className="me-1" /> Add Card Value
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <DataGridColumnFilter
          column={table.getColumn('cardValueIsActive')}
          title="Status"
          options={[
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
          ]}
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={values.length}
          isLoading={loading}
          emptyMessage="No card values found."
          tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <CardValueFormDialog
        value={selectedValue}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadValues}
      />
    </div>
  );
}
