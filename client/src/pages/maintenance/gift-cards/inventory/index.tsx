import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, RefreshCw } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPersistenceJobs, type PersistenceJobRecord } from '@/services/persistenceJob';
import { format, parseISO } from 'date-fns';

const TEMPLATE_ID = 1;

function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd-MMM-yyyy HH:mm');
}

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

export function GiftCardInventoryPage() {
  const [allJobs, setAllJobs] = useState<PersistenceJobRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [sorting, setSorting]   = useState<SortingState>([{ id: 'id', desc: true }]);
  const { toast }     = useToast();
  const { canRead }   = usePermissions();
  const navigate      = useNavigate();

  const jobs = useMemo(
    () => allJobs.filter((j) => j.template?.id === TEMPLATE_ID),
    [allJobs],
  );

  const loadJobs = async () => {
    setLoading(true);
    try {
      setAllJobs(await getPersistenceJobs());
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load inventory uploads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const columns = useMemo<ColumnDef<PersistenceJobRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        size: 70,
      },
      {
        accessorKey: 'createdBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Uploaded by" />,
        cell: ({ row }) => row.original.createdBy ?? '-',
        size: 240,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => row.original.createdAt ? formatDateTime(row.original.createdAt) : '-',
        size: 180,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          return <Badge variant={STATUS_VARIANT[s] ?? 'outline'}>{s}</Badge>;
        },
        size: 130,
      },
      {
        id: 'insertions',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Records" />,
        cell: ({ row }) => {
          const { fileLinesInserted, fileLinesCount } = row.original;
          return `${(fileLinesInserted ?? 0).toLocaleString()} / ${(fileLinesCount ?? 0).toLocaleString()}`;
        },
        size: 110,
        enableSorting: false,
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
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
          <ToolbarPageTitle>Gift Card Inventory</ToolbarPageTitle>
          <ToolbarDescription>Upload and review gift card inventory CSV files</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={loadJobs} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate(`/data-import/new?templateId=${TEMPLATE_ID}`)}>
            <Plus size={16} className="me-1" />
            New Upload
          </Button>
        </ToolbarActions>
      </Toolbar>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4 mt-6">Loading...</div>
      ) : (
        <DataGridContainer className="mt-6">
          <DataGrid
            table={table}
            recordCount={jobs.length}
            emptyMessage="No inventory uploads found. Click New Upload to load your first file."
          >
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
