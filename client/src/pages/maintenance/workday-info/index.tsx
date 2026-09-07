import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { WorkdayInfoDTO, CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO } from '@shared/dto';
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
import { WorkdayInfoFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/pages/reports/components/ExportButton';
import { formatUTCDate } from '@/lib/utils';

export function WorkdayInfoPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<WorkdayInfoDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const records = useEntityList<WorkdayInfoDTO, CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO>({
    endpoint: '/api/workday-info',
    idKey: 'wdid',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' }),
  });

  const handleDeleteClick = (record: WorkdayInfoDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<WorkdayInfoDTO>[]>(
    () => [
      {
        accessorKey: 'wdid',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.wdid}</span>,
        size: 130,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'corporateEmail',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Corporate Email" />,
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.original.corporateEmail ?? ''}>
            {row.original.corporateEmail ?? '—'}
          </span>
        ),
        size: 220,
        meta: { headerTitle: 'Corporate Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'directManager',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Direct Manager" />,
        cell: ({ row }) => (
          <span className="max-w-[160px] truncate block" title={row.original.directManager ?? ''}>
            {row.original.directManager ?? '—'}
          </span>
        ),
        size: 180,
        meta: { headerTitle: 'Direct Manager', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'hireDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Hire Date" />,
        cell: ({ row }) => <span>{row.original.hireDate ? formatUTCDate(row.original.hireDate) : '—'}</span>,
        size: 130,
        meta: { headerTitle: 'Hire Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'billingStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Billing Status" />,
        cell: ({ row }) => <span>{row.original.billingStatus ?? '—'}</span>,
        size: 140,
        meta: { headerTitle: 'Billing Status', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'costCenterNames',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Center" />,
        cell: ({ row }) => (
          <span className="max-w-[160px] truncate block" title={row.original.costCenterNames ?? ''}>
            {row.original.costCenterNames ?? '—'}
          </span>
        ),
        size: 180,
        meta: { headerTitle: 'Cost Center', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'vacation',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vacation Days" />,
        cell: ({ row }) => <span>{row.original.vacation != null ? row.original.vacation : '—'}</span>,
        size: 130,
        meta: { headerTitle: 'Vacation Days', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('WorkdayInfo') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/maintenance/workday-info/${row.original.wdid}`)}
              >
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('WorkdayInfo') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [canCreate, canDelete, navigate],
  );

  const table = useReactTable({
    data: records.items,
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
    records.loadItems();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await records.deleteItem(deletingRecord.wdid);
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  if (!canRead('WorkdayInfo')) {
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
          <ToolbarPageTitle>Workday Info</ToolbarPageTitle>
          <ToolbarDescription>Manage Workday employee information records</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <ExportButton
            searchParams={new URLSearchParams()}
            baseEndpoint="/api/workday-info"
            filenamePrefix="workday-info"
          />
          {canCreate('WorkdayInfo') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="me-1" />
              New Record
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search records..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={records.loading}
          emptyMessage="No workday info records found. Create your first record to get started."
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

      <WorkdayInfoFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          records.loadItems();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workday info record for "{deletingRecord?.wdid}".
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
