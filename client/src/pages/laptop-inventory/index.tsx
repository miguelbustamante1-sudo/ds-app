// client/src/pages/laptop-inventory/index.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { LaptopFormDialog } from './form';
import type { LaptopDTO } from '@shared/dto';
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
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { apiDelete, apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_BADGE_VARIANT: Record<string, 'primary' | 'secondary' | 'destructive' | 'outline'> = {
  Assigned:              'primary',
  Available:             'secondary',
  Reserved:              'outline',
  Damaged:               'destructive',
  'Permanently Damaged': 'destructive',
};

function statusVariant(status: string): 'primary' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_BADGE_VARIANT[status] ?? 'secondary';
}

export function LaptopInventoryPage() {
  const [items, setItems] = useState<LaptopDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LaptopDTO | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<LaptopDTO | null>(null);
  const { canRead, canCreate, canDelete } = usePermissions();
  const { toast } = useToast();

  const loadItems = useCallback(() => {
    setLoading(true);
    apiGet<LaptopDTO[]>('/api/laptops')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleEditClick = (item: LaptopDTO) => {
    setEditingRecord(item);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (item: LaptopDTO) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await apiDelete(`/api/laptops/${deletingItem.laptopId}`);
      toast({ title: 'Success', description: `Laptop ${deletingItem.serialNumber} deleted.` });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      loadItems();
    } catch (error: unknown) {
      toast({
        title:       'Error',
        description: error instanceof Error ? error.message : 'Failed to delete laptop',
        variant:     'destructive',
      });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const regionOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.region).filter(Boolean) as string[]);
    return Array.from(unique).sort().map((v) => ({ value: v, label: v }));
  }, [items]);

  const statusOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.status));
    return Array.from(unique).sort().map((v) => ({ value: v, label: v }));
  }, [items]);

  const brandOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.brand).filter(Boolean) as string[]);
    return Array.from(unique).sort().map((v) => ({ value: v, label: v }));
  }, [items]);

  const blueprintOptions = useMemo(() => {
    const unique = new Set(items.map((i) => i.blueprintName).filter(Boolean) as string[]);
    return Array.from(unique).sort().map((v) => ({ value: v, label: v }));
  }, [items]);

  const columns = useMemo<ColumnDef<LaptopDTO>[]>(
    () => [
      {
        accessorKey: 'serialNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Serial Number" />,
        cell: ({ row }) => <span className="font-medium font-mono text-xs">{row.original.serialNumber}</span>,
        filterFn: (row, _id, value: string) =>
          row.original.serialNumber.toLowerCase().includes(value.toLowerCase()),
        size: 130,
        meta: { headerTitle: 'Serial Number', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'assetNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Asset #" />,
        cell: ({ row }) => row.original.assetNumber ?? <span className="text-muted-foreground">—</span>,
        size: 110,
        meta: { headerTitle: 'Asset #', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'brand',
        accessorFn: (row) => row.brand ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Brand" />,
        cell: ({ row }) => row.original.brand ?? <span className="text-muted-foreground">—</span>,
        filterFn: (row, _id, values: string[]) => values.includes(row.original.brand ?? ''),
        size: 80,
        meta: { headerTitle: 'Brand', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'model',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Model" />,
        cell: ({ row }) => row.original.model ?? <span className="text-muted-foreground">—</span>,
        size: 160,
        meta: {
          headerTitle: 'Model',
          cellClassName: 'whitespace-normal break-words',
          skeleton: <Skeleton className="h-4 w-32" />,
        },
      },
      {
        id: 'region',
        accessorFn: (row) => row.region ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: ({ row }) => row.original.region ?? <span className="text-muted-foreground">—</span>,
        filterFn: (row, _id, values: string[]) => values.includes(row.original.region ?? ''),
        size: 100,
        meta: { headerTitle: 'Region', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
        ),
        filterFn: (row, _id, values: string[]) => values.includes(row.original.status),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        id: 'assignedTo',
        accessorFn: (row) =>
          row.activeAssignment
            ? `${row.activeAssignment.teamMemberNames} ${row.activeAssignment.teamMemberSurnames}`
            : '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assigned To" />,
        cell: ({ row }) =>
          row.original.activeAssignment
            ? `${row.original.activeAssignment.teamMemberNames} ${row.original.activeAssignment.teamMemberSurnames}`
            : <span className="text-muted-foreground">—</span>,
        size: 150,
        meta: { headerTitle: 'Assigned To', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'ramGb',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RAM" />,
        cell: ({ row }) => row.original.ramGb ?? <span className="text-muted-foreground">—</span>,
        size: 70,
        meta: { headerTitle: 'RAM', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'storageGb',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Storage" />,
        cell: ({ row }) => row.original.storageGb ?? <span className="text-muted-foreground">—</span>,
        size: 80,
        meta: { headerTitle: 'Storage', skeleton: <Skeleton className="h-4 w-14" /> },
      },
      {
        accessorKey: 'purchaseDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Purchase Date" />,
        cell: ({ row }) =>
          row.original.purchaseDate ? formatUTCDate(row.original.purchaseDate) : '—',
        size: 120,
        meta: { headerTitle: 'Purchase Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'deviceName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Device Name" />,
        cell: ({ row }) => row.original.deviceName ?? <span className="text-muted-foreground">—</span>,
        size: 160,
        meta: {
          headerTitle: 'Device Name',
          cellClassName: 'whitespace-normal break-words',
          skeleton: <Skeleton className="h-4 w-32" />,
        },
      },
      {
        accessorKey: 'osVersion',
        header: ({ column }) => <DataGridColumnHeader column={column} title="OS Version" />,
        cell: ({ row }) => row.original.osVersion ?? <span className="text-muted-foreground">—</span>,
        size: 90,
        meta: { headerTitle: 'OS Version', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'blueprintName',
        accessorFn: (row) => row.blueprintName ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Blueprint" />,
        cell: ({ row }) => row.original.blueprintName ?? <span className="text-muted-foreground">—</span>,
        filterFn: (row, _id, values: string[]) => values.includes(row.original.blueprintName ?? ''),
        size: 130,
        meta: { headerTitle: 'Blueprint', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'tags',
        accessorFn: (row) => row.tags.join(', '),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Tags" />,
        cell: ({ row }) =>
          row.original.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 150,
        meta: { headerTitle: 'Tags', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'lastCheckIn',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Last Check-In" />,
        cell: ({ row }) =>
          row.original.lastCheckIn
            ? format(new Date(row.original.lastCheckIn), 'dd-MMM-yyyy HH:mm')
            : <span className="text-muted-foreground">—</span>,
        size: 140,
        meta: { headerTitle: 'Last Check-In', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            {canCreate('LaptopInventory') && (
              <Button variant="ghost" size="sm" onClick={() => handleEditClick(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('LaptopInventory') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 52,
        enableSorting: false,
        meta: {
          headerClassName: 'text-center',
          cellClassName:   'text-center',
          skeleton:        <Skeleton className="h-8 w-8 mx-auto" />,
        },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data:    items,
    columns,
    state:   { sorting, columnFilters },
    onSortingChange:       setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel:        getCoreRowModel(),
    getSortedRowModel:      getSortedRowModel(),
    getFilteredRowModel:    getFilteredRowModel(),
    getPaginationRowModel:  getPaginationRowModel(),
    getFacetedRowModel:     getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;

  if (!canRead('LaptopInventory')) {
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
          <ToolbarPageTitle>Laptop Inventory</ToolbarPageTitle>
          <ToolbarDescription>Company devices and their current assignments</ToolbarDescription>
        </ToolbarHeading>
        {canCreate('LaptopInventory') && (
          <Button size="sm" onClick={() => { setEditingRecord(null); setFormDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Laptop
          </Button>
        )}
      </Toolbar>

      <div className="flex items-center gap-2 mt-6 flex-wrap">
        <Input
          placeholder="Search serial number..."
          value={(table.getColumn('serialNumber')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('serialNumber')?.setFilterValue(e.target.value)}
          className="h-8 w-[220px]"
        />
        {table.getColumn('region') && (
          <DataGridColumnFilter
            column={table.getColumn('region')!}
            title="Region"
            options={regionOptions}
          />
        )}
        {table.getColumn('status') && (
          <DataGridColumnFilter
            column={table.getColumn('status')!}
            title="Status"
            options={statusOptions}
          />
        )}
        {table.getColumn('brand') && (
          <DataGridColumnFilter
            column={table.getColumn('brand')!}
            title="Brand"
            options={brandOptions}
          />
        )}
        {table.getColumn('blueprintName') && (
          <DataGridColumnFilter
            column={table.getColumn('blueprintName')!}
            title="Blueprint"
            options={blueprintOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={items.length}
          isLoading={loading}
          emptyMessage="No laptops found."
          tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <LaptopFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => { setFormDialogOpen(open); if (!open) setEditingRecord(null); }}
        record={editingRecord ?? undefined}
        onSuccess={() => { setFormDialogOpen(false); setEditingRecord(null); loadItems(); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete laptop?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deletingItem?.serialNumber}</strong> and close its active
              assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
