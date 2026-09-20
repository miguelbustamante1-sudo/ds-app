import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { HolidayDTO, CreateHolidayDTO, UpdateHolidayDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { formatUTCDate } from '@/lib/utils';
import { HolidayFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function HolidaysPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<HolidayDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const holidays = useEntityList<HolidayDTO, CreateHolidayDTO, UpdateHolidayDTO>({
    endpoint: '/api/holidays',
    idKey: 'holidayId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (holiday: HolidayDTO) => {
    setEditingHoliday(holiday);
    setFormOpen(true);
  };

  const handleDeleteClick = (holiday: HolidayDTO) => {
    setDeletingHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<HolidayDTO>[]>(
    () => [
      {
        accessorKey: 'holidayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.holidayId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'holidayName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.holidayName,
        size: 250,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'holidayDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) =>
          row.original.holidayDate ? formatUTCDate(row.original.holidayDate) : '-',
        size: 140,
        meta: { headerTitle: 'Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => row.original.countryName ?? '-',
        size: 180,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'holidayIsRecurring',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Recurring" />,
        cell: ({ row }) => (row.original.holidayIsRecurring ? 'Yes' : 'No'),
        size: 110,
        meta: { headerTitle: 'Recurring', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'holidayIsHalfDay',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Half Day" />,
        cell: ({ row }) => (row.original.holidayIsHalfDay ? 'Yes' : 'No'),
        size: 110,
        meta: { headerTitle: 'Half Day', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Holidays') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('Holidays') && (
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
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: holidays.items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    holidays.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingHoliday(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHoliday) return;
    try {
      await holidays.deleteItem(deletingHoliday.holidayId);
      setDeleteDialogOpen(false);
      setDeletingHoliday(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingHoliday(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingHoliday(undefined);
    holidays.loadItems();
  };

  if (!canRead('Holidays')) {
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
          <ToolbarPageTitle>Holidays</ToolbarPageTitle>
          <ToolbarDescription>Manage holidays by country</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Holidays') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Holiday
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search holidays..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={holidays.loading}
          emptyMessage="No holidays found. Create your first holiday to get started."
          tableLayout={{
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <HolidayFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        holiday={editingHoliday}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the holiday "{deletingHoliday?.holidayName}". This action
              cannot be undone.
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
