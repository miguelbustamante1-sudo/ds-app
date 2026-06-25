import { useCallback, useEffect, useState } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
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
import { usePermissions } from '@/hooks/usePermissions';
import {
  fetchAllSopLibraryItems,
  deleteSopLibraryItem,
  type SopLibraryItem,
  SOP_TIER_LABELS,
  SOP_TIER_OPTIONS,
} from '@/lib/sop-library.api';
import { SopLibraryDrawer } from './SopLibraryDrawer';

const columnHelper = createColumnHelper<SopLibraryItem>();

const TIER_FILTER_OPTIONS = SOP_TIER_OPTIONS.map((o) => ({
  label: o.label,
  value: String(o.value),
}));

export default function AdminSopLibraryPage() {
  const { canCreate, canDelete } = usePermissions();
  const [items, setItems] = useState<SopLibraryItem[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SopLibraryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SopLibraryItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllSopLibraryItems()
      .then(setItems)
      .catch(() => toast.error('Failed to load SOP Library items'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    columnHelper.accessor('sliName', {
      header: 'Name',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('sliCategory', {
      header: 'Category',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('sliMinTier', {
      header: 'Min Tier',
      filterFn: (row, _, filterValues: string[]) =>
        filterValues.includes(String(row.original.sliMinTier)),
      cell: (info) => (
        <Badge variant="outline">{SOP_TIER_LABELS[info.getValue()] ?? info.getValue()}</Badge>
      ),
    }),
    columnHelper.accessor('sliActive', {
      header: 'Active',
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {canCreate('SopLibrary') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditTarget(row.original);
                setDrawerOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {canDelete('SopLibrary') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: items,
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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSopLibraryItem(deleteTarget.sliId);
      toast.success('Item removed');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to remove item');
    }
  }

  return (
    <div className="container">
      <Card className="mt-4">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>SOP Library</CardTitle>
            {canCreate('SopLibrary') && (
              <Button
                onClick={() => {
                  setEditTarget(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="size-4 me-1" />
                Add SOP
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Search by name..."
              value={(table.getColumn('sliName')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('sliName')?.setFilterValue(e.target.value)}
              className="h-8 w-[180px]"
            />
            <DataGridColumnFilter
              column={table.getColumn('sliMinTier')}
              title="Tier"
              options={TIER_FILTER_OPTIONS}
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={items.length}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <SopLibraryDrawer
        open={drawerOpen}
        item={editTarget}
        onClose={() => {
          setDrawerOpen(false);
          setEditTarget(null);
        }}
        onSaved={() => {
          setDrawerOpen(false);
          setEditTarget(null);
          load();
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove SOP?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.sliName}&quot; will be hidden from all users. This can be undone
              by editing the item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
