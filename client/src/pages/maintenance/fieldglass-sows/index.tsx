import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, PowerOff, RefreshCw, Search, X } from 'lucide-react';
import type { FieldglassSowDTO } from '@shared/dto';
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
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPut } from '@/lib/api';
import { FieldglassSowFormDialog } from './form';

export function FieldglassSowsPage() {
  const [items, setItems] = useState<FieldglassSowDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FieldglassSowDTO | undefined>();
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingRecord, setDeactivatingRecord] = useState<FieldglassSowDTO | null>(null);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [reactivatingRecord, setReactivatingRecord] = useState<FieldglassSowDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'sowId', 'sowName', 'sowOwner', 'tdxSowCreatorsPrimary', 'tdxTaPrimePrimary', 'actions',
  ]);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadItems = async (deactivated = showDeactivated) => {
    setLoading(true);
    try {
      const url = deactivated ? '/api/fieldglass-sows?deactivated=true' : '/api/fieldglass-sows';
      const data = await apiGet<FieldglassSowDTO[]>(url);
      setItems(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Fieldglass SOWs';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(showDeactivated);
    setColumnFilters([]);
  }, [showDeactivated]);

  const handleEdit = (record: FieldglassSowDTO) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const handleDeactivateClick = (record: FieldglassSowDTO) => {
    setDeactivatingRecord(record);
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingRecord) return;
    try {
      await apiPut<FieldglassSowDTO, Record<string, never>>(
        `/api/fieldglass-sows/${deactivatingRecord.fgsId}/deactivate`,
        {},
      );
      toast({ title: 'Success', description: `SOW "${deactivatingRecord.sowName ?? deactivatingRecord.sowId}" deactivated` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate SOW';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeactivateDialogOpen(false);
      setDeactivatingRecord(null);
      loadItems();
    }
  };

  const handleReactivateClick = (record: FieldglassSowDTO) => {
    setReactivatingRecord(record);
    setReactivateDialogOpen(true);
  };

  const handleReactivateConfirm = async () => {
    if (!reactivatingRecord) return;
    try {
      await apiPut<FieldglassSowDTO, Record<string, never>>(
        `/api/fieldglass-sows/${reactivatingRecord.fgsId}/reactivate`,
        {},
      );
      toast({ title: 'Success', description: `SOW "${reactivatingRecord.sowName ?? reactivatingRecord.sowId}" reactivated` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate SOW';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setReactivateDialogOpen(false);
      setReactivatingRecord(null);
      loadItems();
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
    loadItems();
  };

  const columns = useMemo<ColumnDef<FieldglassSowDTO>[]>(
    () => [
      {
        accessorKey: 'sowId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SOW ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.sowId ?? '—'}</span>,
        size: 120,
        meta: { headerTitle: 'SOW ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'sowName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SOW Name" />,
        cell: ({ row }) => row.original.sowName ?? '—',
        filterFn: (row, _id, value: string) =>
          !value || (row.original.sowName ?? '').toLowerCase().includes(value.toLowerCase()),
        size: 350,
        meta: { headerTitle: 'SOW Name', skeleton: <Skeleton className="h-4 w-56" /> },
      },
      {
        accessorKey: 'sowOwner',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SOW Owner" />,
        cell: ({ row }) => row.original.sowOwner ?? '—',
        filterFn: (row, _id, value: string) =>
          !value || (row.original.sowOwner ?? '').toLowerCase().includes(value.toLowerCase()),
        size: 180,
        meta: { headerTitle: 'SOW Owner', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'tdxSowCreatorsPrimary',
        header: ({ column }) => <DataGridColumnHeader column={column} title="TDx SOW Creators (Primary)" />,
        cell: ({ row }) => row.original.tdxSowCreatorsPrimary ?? '—',
        size: 200,
        meta: { headerTitle: 'TDx SOW Creators (Primary)', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'tdxTaPrimePrimary',
        header: ({ column }) => <DataGridColumnHeader column={column} title="TDx TA Prime (Primary)" />,
        cell: ({ row }) => row.original.tdxTaPrimePrimary ?? '—',
        size: 180,
        meta: { headerTitle: 'TDx TA Prime (Primary)', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {!showDeactivated && canCreate('FieldglassSows') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)} title="Edit">
                <Pencil size={16} />
              </Button>
            )}
            {!showDeactivated && canDelete('FieldglassSows') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeactivateClick(row.original)} title="Deactivate">
                <PowerOff size={16} className="text-destructive" />
              </Button>
            )}
            {showDeactivated && canCreate('FieldglassSows') && (
              <Button variant="ghost" size="sm" onClick={() => handleReactivateClick(row.original)} title="Reactivate">
                <RefreshCw size={16} className="text-green-600" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-20 ml-auto" />,
        },
      },
    ],
    [canCreate, canDelete, showDeactivated],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter, columnFilters, columnOrder },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('FieldglassSows')) {
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
          <ToolbarPageTitle>Fieldglass SOWs</ToolbarPageTitle>
          <ToolbarDescription>
            {showDeactivated ? 'Showing deactivated SOWs' : 'Manage Fieldglass Statement of Work records'}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('FieldglassSows') && (
            <Button
              onClick={handleCreate}
              disabled={showDeactivated}
              className="transition-opacity duration-200"
            >
              <Plus size={16} className="me-1" />
              New SOW
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="show-deactivated"
              checked={showDeactivated}
              onCheckedChange={setShowDeactivated}
            />
            <Label htmlFor="show-deactivated" className="cursor-pointer text-sm">
              Show deactivated
            </Label>
          </div>
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SOWs..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Input
          placeholder="Filter by SOW Name..."
          value={(table.getColumn('sowName')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('sowName')?.setFilterValue(e.target.value || undefined)}
          className="h-8 w-[200px]"
        />
        <Input
          placeholder="Filter by SOW Owner..."
          value={(table.getColumn('sowOwner')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('sowOwner')?.setFilterValue(e.target.value || undefined)}
          className="h-8 w-[200px]"
        />
        {columnFilters.length > 0 && (
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

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage={
            showDeactivated
              ? 'No deactivated SOWs found.'
              : 'No Fieldglass SOWs found. Create your first record to get started.'
          }
          tableLayout={{
            columnsMovable: true,
            columnsResizable: true,
            columnsVisibility: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <FieldglassSowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this SOW?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the SOW "{deactivatingRecord?.sowName ?? deactivatingRecord?.sowId}".
              It will no longer appear in the active list. You can reactivate it at any time using the "Show deactivated" toggle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateConfirm}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate this SOW?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reactivate the SOW "{reactivatingRecord?.sowName ?? reactivatingRecord?.sowId}" and make it visible in the active list again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateConfirm}>Reactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
