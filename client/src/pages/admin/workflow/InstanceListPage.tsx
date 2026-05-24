import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Plus, X } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { StartWorkflowModal } from './components/StartWorkflowModal';
import { AdminForceCompleteModal } from './components/AdminForceCompleteModal';
import { AdminDestroyModal } from './components/AdminDestroyModal';
import type { WinWorkflowInstance } from './types';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Destroyed', value: 'DESTROYED' },
];

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (status === 'COMPLETED') return <Badge variant="primary" appearance="light">Completed</Badge>;
  if (status === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  if (status === 'DESTROYED') return <Badge variant="secondary" appearance="light">Destroyed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function InstanceListPage() {
  const navigate = useNavigate();
  const { canRead, canCreate } = usePermissions();
  const { toast } = useToast();

  const [instances, setInstances] = useState<WinWorkflowInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [forceCompleteWinId, setForceCompleteWinId] = useState<string | null>(null);
  const [destroyWinId, setDestroyWinId] = useState<string | null>(null);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const data = await apiGet<WinWorkflowInstance[]>('/api/workflow/instances');
      setInstances(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load instances';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInstances();
  }, []);

  const workflowCodeOptions = useMemo(() => {
    const unique = new Set<string>();
    instances.forEach((i) => unique.add(i.workflowCode));
    return Array.from(unique).map((v) => ({ label: v, value: v }));
  }, [instances]);

  const columns = useMemo<ColumnDef<WinWorkflowInstance>[]>(
    () => [
      {
        accessorKey: 'workflowCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workflow Code" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.workflowCode}</span>,
        filterFn: (row, _, vals: string[]) => vals.includes(row.original.workflowCode),
        size: 160,
        meta: { headerTitle: 'Workflow Code', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 220,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => statusBadge(row.original.status),
        filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.status),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'startedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Started At" />,
        cell: ({ row }) => formatUTCDate(row.original.startedAt),
        size: 140,
        meta: { headerTitle: 'Started At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'startedBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Started By" />,
        cell: ({ row }) => row.original.startedBy ?? '—',
        size: 180,
        meta: { headerTitle: 'Started By', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'businessReferenceType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Ref. Type" />,
        cell: ({ row }) => row.original.businessReferenceType ?? '—',
        filterFn: (row, _, value: string) =>
          !value ||
          (row.original.businessReferenceType ?? '')
            .toLowerCase()
            .includes(value.toLowerCase()),
        size: 140,
        meta: { headerTitle: 'Ref. Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const inst = row.original;
          const isActive = inst.status === 'ACTIVE';
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/workflow/instances/${inst.winId}`)}
              >
                View
              </Button>
              {isActive && canCreate('WorkflowAdmin') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForceCompleteWinId(inst.winId)}
                >
                  Force Complete
                </Button>
              )}
              {isActive && canCreate('WorkflowAdmin') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDestroyWinId(inst.winId)}
                >
                  Destroy
                </Button>
              )}
            </div>
          );
        },
        size: 220,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-32 ml-auto" />,
        },
      },
    ],
    [canCreate, navigate],
  );

  const table = useReactTable({
    data: instances,
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

  if (!canRead('WorkflowAdmin')) {
    return null;
  }

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Workflow Instances</ToolbarPageTitle>
          <ToolbarDescription>Monitor and manage active workflow instances</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('WorkflowAdmin') && (
            <Button onClick={() => setStartOpen(true)}>
              <Plus size={16} className="me-1" />
              Start New Workflow
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('status') && (
          <DataGridColumnFilter
            column={table.getColumn('status')}
            title="Status"
            options={STATUS_OPTIONS}
          />
        )}
        {table.getColumn('workflowCode') && (
          <DataGridColumnFilter
            column={table.getColumn('workflowCode')}
            title="Workflow Code"
            options={workflowCodeOptions}
          />
        )}
        <Input
          placeholder="Filter by ref. type..."
          value={(table.getColumn('businessReferenceType')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('businessReferenceType')?.setFilterValue(e.target.value)
          }
          className="h-8 w-[160px]"
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

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={instances.length}
          isLoading={loading}
          emptyMessage="No workflow instances found."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <StartWorkflowModal
        open={startOpen}
        onOpenChange={setStartOpen}
        onSuccess={() => {
          setStartOpen(false);
          void loadInstances();
        }}
      />

      {forceCompleteWinId && (
        <AdminForceCompleteModal
          winId={forceCompleteWinId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setForceCompleteWinId(null);
          }}
          onSuccess={() => {
            setForceCompleteWinId(null);
            void loadInstances();
          }}
        />
      )}

      {destroyWinId && (
        <AdminDestroyModal
          winId={destroyWinId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDestroyWinId(null);
          }}
          onSuccess={() => {
            setDestroyWinId(null);
            void loadInstances();
          }}
        />
      )}
    </div>
  );
}
