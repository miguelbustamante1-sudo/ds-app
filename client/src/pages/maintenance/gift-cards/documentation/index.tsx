import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getDocumentations } from '@/services/giftCardDocumentation';
import { formatUTCDate } from '@/lib/utils';
import { DocumentationFormDialog } from './DocumentationFormDialog';
import type { GiftCardDocumentationDTO } from '@shared/dto/GiftCardDocumentation';

export function GiftCardDocumentationPage() {
  const [records, setRecords]           = useState<GiftCardDocumentationDTO[]>([]);
  const [loading, setLoading]           = useState(false);
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formOpen, setFormOpen]         = useState(false);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getDocumentations();
      setRecords(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load documentation records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const columns = useMemo<ColumnDef<GiftCardDocumentationDTO>[]>(() => [
    {
      accessorKey: 'documentationId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
      size: 70,
      meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
    },
    {
      accessorKey: 'assignmentId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Assignment" />,
      cell: ({ row }) => `#${row.original.assignmentId}`,
      size: 110,
      meta: { headerTitle: 'Assignment', skeleton: <Skeleton className="h-4 w-16" /> },
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Value" />,
      cell: ({ row }) => Number(row.original.value).toFixed(2),
      size: 100,
      meta: { headerTitle: 'Value', skeleton: <Skeleton className="h-4 w-16" /> },
    },
    {
      accessorKey: 'cardTypeName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Card Type" />,
      size: 150,
      meta: { headerTitle: 'Card Type', skeleton: <Skeleton className="h-4 w-24" /> },
    },
    {
      accessorKey: 'cardNumber',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Card #" />,
      size: 160,
      meta: { headerTitle: 'Card #', skeleton: <Skeleton className="h-4 w-28" /> },
    },
    {
      accessorKey: 'amountNotSpent',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Amount Not Spent" />,
      cell: ({ row }) =>
        row.original.amountNotSpent !== null
          ? Number(row.original.amountNotSpent).toFixed(2)
          : '—',
      size: 160,
      meta: { headerTitle: 'Amount Not Spent', skeleton: <Skeleton className="h-4 w-20" /> },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
      cell: ({ row }) => formatUTCDate(row.original.createdAt),
      size: 120,
      meta: { headerTitle: 'Date', skeleton: <Skeleton className="h-4 w-24" /> },
    },
  ], []);

  const table = useReactTable({
    data: records,
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

  if (!canRead('GiftCardDocumentation')) {
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
          <ToolbarPageTitle>Gift Card Documentation</ToolbarPageTitle>
          <ToolbarDescription>Record and review gift card usage receipts</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadRecords} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate('GiftCardDocumentation') && (
            <Button onClick={() => setFormOpen(true)}>+ New Record</Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <DataGridContainer className="mt-6">
        <DataGrid
          table={table}
          recordCount={records.length}
          isLoading={loading}
          emptyMessage="No documentation records found."
          tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <DocumentationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadRecords}
      />
    </div>
  );
}
