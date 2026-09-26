import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
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
} from '@/components/ui/toolbar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { apiGet } from '@/lib/api';
import { formatUTCDateTime } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { WitInstanceTask } from './types';
import { TaskExecutionDrawer } from './components/TaskExecutionDrawer';

const STATE_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
];

function stateBadge(state: string) {
  if (state === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (state === 'PENDING') return <Badge variant="secondary" appearance="light">Pending</Badge>;
  if (state === 'COMPLETED') return <Badge variant="success" appearance="light">Completed</Badge>;
  if (state === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

function instanceStatusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (status === 'COMPLETED') return <Badge variant="secondary" appearance="light">Completed</Badge>;
  if (status === 'CANCELLED') return <Badge variant="destructive" appearance="light">Cancelled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

// Minimal instance header shape derived from the task list
interface InstanceHeader {
  winId: string;
  name: string;
  workflowCode: string;
  status: string;
  startedAt: string | null;
  startedBy: string | null;
  ownerUserId: string | null;
}

export function WorkflowInstancePage() {
  const { winId } = useParams<{ winId: string }>();
  const { canRead } = usePermissions();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<WitInstanceTask[]>([]);
  const [instance, setInstance] = useState<InstanceHeader | null>(null);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWitId, setSelectedWitId] = useState<string | null>(null);

  const loadData = async () => {
    if (!winId) return;
    setLoading(true);
    try {
      // TODO: If a dedicated GET /api/workflow/instances/:winId endpoint is added,
      // fetch the instance header from there instead of deriving it from tasks.
      const taskList = await apiGet<WitInstanceTask[]>(
        `/api/workflow/instances/${winId}/tasks`,
      );
      setTasks(taskList);

      // Derive a minimal instance header from the task data (first task's winId is sufficient)
      if (taskList.length > 0) {
        setInstance({
          winId: taskList[0].winId,
          // These fields are not available from the task list — show winId as fallback
          name: winId,
          workflowCode: '—',
          status: '—',
          startedAt: null,
          startedBy: null,
          ownerUserId: null,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load instance';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [winId]);

  const openDrawer = (witIdValue: string) => {
    setSelectedWitId(witIdValue);
    setDrawerOpen(true);
  };

  const columns = useMemo<ColumnDef<WitInstanceTask>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
        size: 120,
        meta: { headerTitle: 'Code', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Task Name" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline text-left"
            onClick={() => openDrawer(row.original.witId)}
          >
            {row.original.name}
          </button>
        ),
        size: 200,
        meta: { headerTitle: 'Task Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataGridColumnHeader column={column} title="State" />,
        cell: ({ row }) => stateBadge(row.original.state),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.state),
        size: 110,
        meta: { headerTitle: 'State', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        id: 'assignedTo',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assigned To" />,
        cell: ({ row }) =>
          row.original.assignedUserId ?? row.original.assignedRoleId ?? '—',
        size: 180,
        meta: { headerTitle: 'Assigned To', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'dueAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) =>
          row.original.dueAt ? formatUTCDateTime(row.original.dueAt) : '—',
        size: 130,
        meta: { headerTitle: 'Due Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'completedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Completed At" />,
        cell: ({ row }) =>
          row.original.completedAt ? formatUTCDateTime(row.original.completedAt) : '—',
        size: 140,
        meta: { headerTitle: 'Completed At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'outcomeCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Outcome" />,
        cell: ({ row }) => row.original.outcomeCode ?? '—',
        size: 120,
        meta: { headerTitle: 'Outcome', skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tasks,
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

  if (!canRead('Workflow')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Workflow Instance</ToolbarPageTitle>
          <ToolbarDescription>View all tasks for this workflow instance</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {loading ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {instance && (
            <Card>
              <CardContent>
                <CardTitle className="mb-4">Instance Details</CardTitle>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Instance ID</dt>
                    <dd className="font-mono">{instance.winId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd>{instance.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>{instanceStatusBadge(instance.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Started At</dt>
                    <dd>{instance.startedAt ? formatUTCDateTime(instance.startedAt) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Started By</dt>
                    <dd>{instance.startedBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd>{instance.ownerUserId ?? '—'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2">
            {table.getColumn('state') && (
              <DataGridColumnFilter
                column={table.getColumn('state')}
                title="State"
                options={STATE_OPTIONS}
              />
            )}
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

          <DataGridContainer>
            <DataGrid
              table={table}
              recordCount={tasks.length}
              isLoading={loading}
              emptyMessage="No tasks found for this instance."
              tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
            >
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </div>
      )}

      <TaskExecutionDrawer
        witId={selectedWitId}
        winId={winId ?? null}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTaskUpdated={loadData}
        isClaimedByMe={false}
      />
    </div>
  );
}
