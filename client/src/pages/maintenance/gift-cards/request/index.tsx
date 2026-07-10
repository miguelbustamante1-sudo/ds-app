import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getAssignments } from '@/services/giftCardAssignment';
import { RequestFormDialog } from './RequestFormDialog';
import type { GiftCardAssignmentDTO } from '@shared/dto/GiftCardAssignment';

const STATUS_OPTIONS = [
  { label: 'Authorized', value: 'Authorized' },
  { label: 'Pending', value: 'Pending' },
];

export function GiftCardRequestPage() {
  const [assignments, setAssignments] = useState<GiftCardAssignmentDTO[]>([]);
  const [loading, setLoading]         = useState(false);
  const [sorting, setSorting]         = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen]       = useState(false);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await getAssignments();
      setAssignments(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssignments(); }, []);

  const columns = useMemo<ColumnDef<GiftCardAssignmentDTO>[]>(() => [
    {
      accessorKey: 'assignmentId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
      size: 70,
      meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
    },
    {
      accessorKey: 'countryName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
      size: 140,
      meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: 'poolName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Pool" />,
      size: 160,
      meta: { headerTitle: 'Pool', skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: 'reasonName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Reason" />,
      size: 180,
      meta: { headerTitle: 'Reason', skeleton: <Skeleton className="h-4 w-28" /> },
    },
    {
      accessorKey: 'cardTypeName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Card Type" />,
      size: 140,
      meta: { headerTitle: 'Card Type', skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: 'cardValueAmount',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Value" />,
      cell: ({ row }) => `${row.original.cardValueCurrency} ${Number(row.original.cardValueAmount).toFixed(2)}`,
      size: 110,
      meta: { headerTitle: 'Value', skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: 'assignmentAmount',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
      size: 90,
      meta: { headerTitle: 'Amount', skeleton: <Skeleton className="h-4 w-12" /> },
    },
    {
      accessorKey: 'assignmentAuthStatus',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      cell: ({ row }) => row.original.assignmentAuthStatus === 'Authorized'
        ? <Badge variant="success">Authorized</Badge>
        : <Badge variant="secondary">Pending</Badge>,
      filterFn: (row, _, filterValues: string[]) =>
        filterValues.includes(row.original.assignmentAuthStatus),
      size: 120,
      meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
    },
  ], []);

  const table = useReactTable({
    data: assignments,
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
          <ToolbarPageTitle>Gift Card Distribution Requests</ToolbarPageTitle>
          <ToolbarDescription>Request and review gift card distribution assignments</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadAssignments} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate('GiftCardCatalog') && (
            <Button onClick={() => setFormOpen(true)}>+ New Request</Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <DataGridColumnFilter
          column={table.getColumn('assignmentAuthStatus')}
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
          emptyMessage="No distribution requests found."
          tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <RequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadAssignments}
      />
    </div>
  );
}
