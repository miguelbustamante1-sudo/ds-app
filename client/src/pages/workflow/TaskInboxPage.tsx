import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { X } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { TaskInboxItem } from './types';
import { TaskExecutionDrawer } from './components/TaskExecutionDrawer';

const STATE_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const SLA_OPTIONS = [
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'On Time', value: 'ON_TIME' },
  { label: 'No SLA', value: 'NO_SLA' },
];

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

function stateBadge(state: string) {
  if (state === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (state === 'PENDING') return <Badge variant="secondary" appearance="light">Pending</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

function slaBadge(isOverdue: boolean, dueAt: string | null) {
  if (!dueAt) return <Badge variant="secondary" appearance="light">No SLA</Badge>;
  if (isOverdue) return <Badge variant="destructive" appearance="light">Overdue</Badge>;
  return <Badge variant="success" appearance="light">On Time</Badge>;
}

function slaStatusValue(item: TaskInboxItem): string {
  if (!item.dueAt) return 'NO_SLA';
  return item.isOverdue ? 'OVERDUE' : 'ON_TIME';
}

export function TaskInboxPage() {
  const { canRead, canCreate } = usePermissions();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWitId, setSelectedWitId] = useState<string | null>(null);
  const [selectedWinId, setSelectedWinId] = useState<string | null>(null);
  const [selectedIsClaimedByMe, setSelectedIsClaimedByMe] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<TaskInboxItem[]>('/api/workflow/inbox');
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load inbox';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const openDrawer = (item: TaskInboxItem) => {
    setSelectedWitId(item.witId);
    setSelectedWinId(item.winId);
    setSelectedIsClaimedByMe(item.isClaimedByMe);
    setDrawerOpen(true);
  };

  const handleClaim = async (item: TaskInboxItem) => {
    if (!canCreate('Workflow')) return;
    try {
      await apiPost<unknown, Record<string, never>>(
        `/api/workflow/instances/${item.winId}/tasks/${item.witId}/claim`,
        {},
      );
      toast({ title: 'Success', description: 'Task claimed.' });
      await loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to claim task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleRelease = async (item: TaskInboxItem) => {
    if (!canCreate('Workflow')) return;
    try {
      await apiPost<unknown, Record<string, never>>(
        `/api/workflow/instances/${item.winId}/tasks/${item.witId}/unclaim`,
        {},
      );
      toast({ title: 'Success', description: 'Task released.' });
      await loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<TaskInboxItem>[]>(
    () => [
      {
        accessorKey: 'witName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Task" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline text-left"
            onClick={() => openDrawer(row.original)}
          >
            {row.original.witName}
          </button>
        ),
        size: 220,
        meta: { headerTitle: 'Task', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'winName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workflow" />,
        size: 200,
        meta: { headerTitle: 'Workflow', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => priorityBadge(row.original.priority),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.priority),
        size: 110,
        meta: { headerTitle: 'Priority', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'dueAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) =>
          row.original.dueAt ? formatUTCDate(row.original.dueAt) : '—',
        size: 130,
        meta: { headerTitle: 'Due Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'slaStatus',
        accessorFn: (row) => slaStatusValue(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="SLA Status" />,
        cell: ({ row }) => slaBadge(row.original.isOverdue, row.original.dueAt),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(slaStatusValue(row.original)),
        size: 120,
        meta: { headerTitle: 'SLA Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataGridColumnHeader column={column} title="State" />,
        cell: ({ row }) => stateBadge(row.original.state),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.state),
        size: 100,
        meta: { headerTitle: 'State', skeleton: <Skeleton className="h-5 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;

          if (item.state === 'PENDING') {
            return (
              <div className="flex justify-end">
                <span className="text-sm text-muted-foreground">Upcoming</span>
              </div>
            );
          }

          if (item.state === 'ACTIVE') {
            if (item.isClaimedByMe) {
              return (
                <div className="flex justify-end items-center gap-2">
                  <Button size="sm" onClick={() => openDrawer(item)}>
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRelease(item)}
                    className="text-muted-foreground"
                  >
                    Release
                  </Button>
                </div>
              );
            }

            if (item.isClaimed && !item.isClaimedByMe) {
              return (
                <div className="flex justify-end">
                  <Badge variant="secondary" appearance="light">Claimed</Badge>
                </div>
              );
            }

            // Not claimed — offer Claim button
            return (
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => openDrawer(item)}>
                  Open
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleClaim(item)}>
                  Claim
                </Button>
              </div>
            );
          }

          return null;
        },
        size: 180,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-24 ml-auto" />,
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canCreate],
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
          <ToolbarPageTitle>My Tasks</ToolbarPageTitle>
          <ToolbarDescription>Tasks assigned to you or available to claim</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('state') && (
          <DataGridColumnFilter
            column={table.getColumn('state')}
            title="State"
            options={STATE_OPTIONS}
          />
        )}
        {table.getColumn('priority') && (
          <DataGridColumnFilter
            column={table.getColumn('priority')}
            title="Priority"
            options={PRIORITY_OPTIONS}
          />
        )}
        {table.getColumn('slaStatus') && (
          <DataGridColumnFilter
            column={table.getColumn('slaStatus')}
            title="SLA Status"
            options={SLA_OPTIONS}
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

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={tasks.length}
          isLoading={loading}
          emptyMessage="No tasks in your inbox."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <TaskExecutionDrawer
        witId={selectedWitId}
        winId={selectedWinId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTaskUpdated={loadTasks}
        isClaimedByMe={selectedIsClaimedByMe}
      />
    </div>
  );
}
