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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Link } from 'react-router';
import { AlertCircle, Clock, ListChecks, X } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { formatUTCDateTime } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { TaskInboxItem } from './types';
import { TaskExecutionDrawer } from './components/TaskExecutionDrawer';

const PRIORITY_WEIGHT: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

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

function priorityDot(priority: string) {
  const base = 'inline-block w-2.5 h-2.5 rounded-full shrink-0';
  if (priority === 'CRITICAL') return <span className={`${base} bg-destructive`} aria-hidden="true" />;
  if (priority === 'HIGH')     return <span className={`${base} bg-destructive/60`} aria-hidden="true" />;
  if (priority === 'MEDIUM')   return <span className={`${base} bg-warning`} aria-hidden="true" />;
  if (priority === 'LOW')      return <span className={`${base} bg-success`} aria-hidden="true" />;
  return <span className={`${base} bg-muted`} aria-hidden="true" />;
}

function priorityBadge(priority: string) {
  return (
    <div className="flex items-center gap-2">
      {priorityDot(priority)}
      {priority === 'LOW'      && <Badge variant="primary" appearance="light">Low</Badge>}
      {priority === 'MEDIUM'   && <Badge variant="warning" appearance="light">Medium</Badge>}
      {priority === 'HIGH'     && <Badge variant="destructive" appearance="light">High</Badge>}
      {priority === 'CRITICAL' && <Badge variant="destructive">Critical</Badge>}
      {!['LOW','MEDIUM','HIGH','CRITICAL'].includes(priority) && <Badge variant="outline">{priority}</Badge>}
    </div>
  );
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

export function WorkflowTasksTab() {
  const { canCreate } = usePermissions();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWitId, setSelectedWitId] = useState<string | null>(null);
  const [selectedWinId, setSelectedWinId] = useState<string | null>(null);
  const [selectedIsClaimedByMe, setSelectedIsClaimedByMe] = useState(false);

  // Default sort: highest priority first, then oldest due date. Overridden when user clicks a column header.
  const sortedTasks = useMemo(() => {
    if (sorting.length > 0) return tasks;
    return [...tasks].sort((a, b) => {
      const pw = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
      if (pw !== 0) return pw;
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }, [tasks, sorting]);

  const summary = useMemo(() => ({
    total: tasks.length,
    overdue: tasks.filter((t) => t.isOverdue).length,
    critical: tasks.filter((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH').length,
    active: tasks.filter((t) => t.state === 'ACTIVE').length,
  }), [tasks]);

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

  const openDrawer = useCallback((item: TaskInboxItem) => {
    setSelectedWitId(item.witId);
    setSelectedWinId(item.winId);
    setSelectedIsClaimedByMe(item.isClaimedByMe);
    setDrawerOpen(true);
  }, []);

  const handleClaim = useCallback(async (item: TaskInboxItem) => {
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
  }, [canCreate, loadTasks, toast]);

  const handleRelease = useCallback(async (item: TaskInboxItem) => {
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
  }, [canCreate, loadTasks, toast]);

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
        cell: ({ row }) =>
          row.original.entityUrl && row.original.entitySummary ? (
            <Link
              to={row.original.entityUrl}
              className="text-primary underline-offset-4 hover:underline"
            >
              {row.original.entitySummary}
            </Link>
          ) : (
            <span>{row.original.winName}</span>
          ),
        size: 260,
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
          row.original.dueAt ? formatUTCDateTime(row.original.dueAt) : '—',
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
            // Claim/Release/Claimed only apply to ROLE-assigned tasks — every
            // other assignment type (USER/DYNAMIC/DYNAMIC_TD_HIERARCHY/CONTEXT)
            // always has resolvedUserId set directly by assignment, not by a
            // claim, so there's nothing to claim or release even though
            // isClaimed/isClaimedByMe would otherwise look the same.
            if (item.assignmentType !== 'ROLE') {
              return (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => openDrawer(item)}>Open</Button>
                </div>
              );
            }
            if (item.isClaimedByMe) {
              return (
                <div className="flex justify-end items-center gap-2">
                  <Button size="sm" onClick={() => openDrawer(item)}>Open</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRelease(item)} className="text-muted-foreground">
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
            return (
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => openDrawer(item)}>Open</Button>
                <Button variant="outline" size="sm" onClick={() => handleClaim(item)}>Claim</Button>
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
    [canCreate, openDrawer, handleClaim, handleRelease],
  );

  const table = useReactTable({
    data: sortedTasks,
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

  const isFiltered = columnFilters.length > 0;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 mb-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</span>
            </div>
            <p className={`text-2xl font-bold ${summary.overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {loading ? '—' : summary.overdue}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {priorityDot('CRITICAL')}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">High / Critical</span>
            </div>
            <p className={`text-2xl font-bold ${summary.critical > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {loading ? '—' : summary.critical}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : summary.active}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {table.getColumn('state') && (
          <DataGridColumnFilter column={table.getColumn('state')} title="State" options={STATE_OPTIONS} />
        )}
        {table.getColumn('priority') && (
          <DataGridColumnFilter column={table.getColumn('priority')} title="Priority" options={PRIORITY_OPTIONS} />
        )}
        {table.getColumn('slaStatus') && (
          <DataGridColumnFilter column={table.getColumn('slaStatus')} title="SLA Status" options={SLA_OPTIONS} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={sortedTasks.length}
          isLoading={loading}
          emptyMessage="No tasks in your inbox."
          tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
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
    </>
  );
}
