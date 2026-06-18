import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { CountryDTO, CreateCountryDTO, UpdateCountryDTO, RegionDTO } from '@shared/dto';
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
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { CountryFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';

export function CountriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCountry, setDeletingCountry] = useState<CountryDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [regions, setRegions] = useState<RegionDTO[]>([]);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const countries = useEntityList<CountryDTO, CreateCountryDTO, UpdateCountryDTO>({
    endpoint: '/api/countries',
    idKey: 'countryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    countries.loadItems();
    apiGet<RegionDTO[]>('/api/regions')
      .then(setRegions)
      .catch(() => {});
  }, []);

  const regionMap = useMemo(() => {
    const map = new Map<number, string>();
    regions.forEach((r) => map.set(r.regionId, r.regionName));
    return map;
  }, [regions]);

  const handleCreate = () => {
    setEditingCountry(undefined);
    setFormOpen(true);
  };

  const handleEdit = (country: CountryDTO) => {
    setEditingCountry(country);
    setFormOpen(true);
  };

  const handleDeleteClick = (country: CountryDTO) => {
    setDeletingCountry(country);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCountry) return;
    try {
      await countries.deleteItem(deletingCountry.countryId);
      setDeleteDialogOpen(false);
      setDeletingCountry(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingCountry(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingCountry(undefined);
    countries.loadItems();
  };

  const regionOptions = useMemo(
    () =>
      regions.map((r) => ({
        value: r.regionId.toString(),
        label: r.regionName,
      })),
    [regions]
  );

  const columns = useMemo<ColumnDef<CountryDTO>[]>(
    () => [
      {
        accessorKey: 'countryId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.countryId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.countryName,
        filterFn: (row, _id, value: string) =>
          row.original.countryName.toLowerCase().includes(value.toLowerCase()),
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'region',
        accessorFn: (row) => (row.regionId != null ? regionMap.get(row.regionId) ?? '' : ''),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Region" />,
        cell: ({ row }) =>
          row.original.regionId != null
            ? (regionMap.get(row.original.regionId) ?? row.original.regionId)
            : '-',
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.regionId?.toString() ?? '');
        },
        size: 180,
        meta: { headerTitle: 'Region', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'countryIso',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ISO Code" />,
        cell: ({ row }) => row.original.countryIso ?? '-',
        size: 100,
        meta: { headerTitle: 'ISO Code', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'currencySymbol',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Currency Symbol" />,
        cell: ({ row }) => row.original.currencySymbol ?? '-',
        size: 140,
        meta: { headerTitle: 'Currency Symbol', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Countries') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('Countries') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
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
    [canCreate, canDelete, regionMap]
  );

  const table = useReactTable({
    data: countries.items,
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

  const isFiltered = columnFilters.length > 0 || nameFilter !== '';

  const handleNameFilterChange = (value: string) => {
    setNameFilter(value);
    table.getColumn('countryName')?.setFilterValue(value);
  };

  const handleReset = () => {
    setNameFilter('');
    table.resetColumnFilters();
  };

  if (!canRead('Countries')) {
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
          <ToolbarPageTitle>Countries</ToolbarPageTitle>
          <ToolbarDescription>Manage countries catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Countries') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Country
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search by name..."
          value={nameFilter}
          onChange={(e) => handleNameFilterChange(e.target.value)}
          className="h-8 w-[200px]"
        />
        {table.getColumn('region') && (
          <DataGridColumnFilter
            column={table.getColumn('region')}
            title="Region"
            options={regionOptions}
          />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={handleReset} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={countries.items.length}
          isLoading={countries.loading}
          emptyMessage="No countries found. Create your first country to get started."
          tableLayout={{
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <CountryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        country={editingCountry}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the country "{deletingCountry?.countryName}".
              This action cannot be undone.
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
