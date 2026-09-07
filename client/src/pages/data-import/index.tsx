import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, RefreshCw, Search } from 'lucide-react';
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
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPersistenceJobs, type PersistenceJobRecord } from '@/services/persistenceJob';
import { format, parseISO } from 'date-fns';

/** Formats a full ISO datetime string preserving the actual time component. */
function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'MMM dd, yyyy HH:mm');
}

// --- Status badge colours -----------------------------------------------------

const STATUS_VARIANT: Record<
  string,
  'secondary' | 'destructive' | 'outline' | 'primary' | 'success' | 'warning' | 'info'
> = {
  NEW:        'outline',
  WAITING:    'warning',
  RUNNING:    'info',
  SUCCESSFUL: 'success',
  FAILED:     'destructive',
  CANCELED:   'secondary',
};

// --- Page component -----------------------------------------------------------

export function DataImportPage() {
  const [jobs, setJobs] = useState<PersistenceJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead } = usePermissions();
  const navigate = useNavigate();

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getPersistenceJobs();
      setJobs(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to load import jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const columns = useMemo<ColumnDef<PersistenceJobRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Author" />,
        cell: ({ row }) => row.original.createdBy ?? '-',
        size: 220,
        meta: { headerTitle: 'Author', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created Date" />,
        cell: ({ row }) =>
          row.original.createdAt ? formatDateTime(row.original.createdAt) : '-',
        size: 180,
        meta: { headerTitle: 'Created Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'template',
        accessorFn: (row) => row.template?.name ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Template" />,
        cell: ({ row }) => row.original.template?.name ?? '-',
        size: 220,
        meta: { headerTitle: 'Template', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>
              {status}
            </Badge>
          );
        },
        size: 130,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-6 w-20" /> },
      },
      {
        id: 'insertions',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Insertions" />,
        cell: ({ row }) => {
          const { fileLinesInserted, fileLinesCount } = row.original;
          return `${(fileLinesInserted ?? 0).toLocaleString()} / ${(fileLinesCount ?? 0).toLocaleString()}`;
        },
        size: 110,
        enableSorting: false,
        meta: { headerTitle: 'Insertions', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/data-import/${row.original.id}`)}
          >
            View
          </Button>
        ),
        size: 80,
        enableSorting: false,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-8 w-14" /> },
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('PersistenceTemplates')) {
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
          <ToolbarPageTitle>Data Import</ToolbarPageTitle>
          <ToolbarDescription>View and monitor persistence import jobs</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadJobs} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/data-import/new')}>
            <Plus size={16} className="me-1" />
            New Data Import
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No import jobs found."
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
    </div>
  );
}
