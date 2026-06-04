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
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { X } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { StandaloneTaskDTO } from '@shared/dto';
import { CreateTaskDialog } from './CreateTaskDialog';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const SOURCE_OPTIONS = [
  { label: 'Internal', value: 'INTERNAL' },
  { label: 'API', value: 'API' },
];

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

function statusBadge(status: string) {
  if (status === 'PENDING') return <Badge variant="warning" appearance="light">Pending</Badge>;
  if (status === 'APPROVED') return <Badge variant="success" appearance="light">Approved</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive" appearance="light">Rejected</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function sourceBadge(source: string) {
  if (source === 'API') return <Badge variant="secondary" appearance="light">API</Badge>;
  return <Badge variant="outline" appearance="light">Internal</Badge>;
}

interface CancelTaskButtonProps {
  taskId: number;
  onCancelled: () => void;
}

function CancelTaskButton({ taskId, onCancelled }: CancelTaskButtonProps) {
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiPatch(`/api/standalone-tasks/${taskId}/resolve`, {
        status: 'REJECTED',
        comment: 'Cancelled by administrator',
      });
      toast({ title: 'Task cancelled' });
      onCancelled();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelling}>
      {cancelling ? 'Cancelling...' : 'Cancel'}
    </Button>
  );
}

export function StandaloneTasksAdminPage() {
  const { canRead, canCreate } = usePermissions();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<StandaloneTaskDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<StandaloneTaskDTO[]>(
        `/api/standalone-tasks?showResolved=${showResolved}`,
      );
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [showResolved, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const assigneeOptions = useMemo(() => {
    const seen = new Map<number, string>();
    tasks.forEach((t) => {
      if (!seen.has(t.teamMemberId)) {
        seen.set(t.teamMemberId, `${t.teamMemberNames} ${t.teamMemberSurnames}`);
      }
    });
    return Array.from(seen, ([value, label]) => ({ value: String(value), label }));
  }, [tasks]);

  const columns = useMemo<ColumnDef<StandaloneTaskDTO>[]>(
    () => [
      {
        accessorKey: 'taskTitle',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        size: 220,
        meta: { headerTitle: 'Title', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'assignee',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assignee" />,
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(String(row.original.teamMemberId)),
        size: 180,
        meta: { headerTitle: 'Assignee', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'taskPriority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => priorityBadge(row.original.taskPriority),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.taskPriority),
        size: 110,
        meta: { headerTitle: 'Priority', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'taskStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => statusBadge(row.original.taskStatus),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.taskStatus),
        size: 110,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'taskDueDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due Date" />,
        cell: ({ row }) => {
          if (!row.original.taskDueDate) return '—';
          const formatted = formatUTCDate(row.original.taskDueDate);
          return row.original.isOverdue ? (
            <span className="text-destructive font-medium">{formatted}</span>
          ) : formatted;
        },
        size: 130,
        meta: { headerTitle: 'Due Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'taskSource',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Source" />,
        cell: ({ row }) => sourceBadge(row.original.taskSource),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.taskSource),
        size: 100,
        meta: { headerTitle: 'Source', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const task = row.original;
          if (task.taskStatus !== 'PENDING' || !canCreate('StandaloneTaskAdmin')) return null;
          return (
            <div className="flex justify-end">
              <CancelTaskButton taskId={task.taskId} onCancelled={loadTasks} />
            </div>
          );
        },
        size: 110,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-24 ml-auto" />,
        },
      },
    ],
    [canCreate, loadTasks],
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

  if (!canRead('StandaloneTaskAdmin')) {
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
          <ToolbarPageTitle>Standalone Tasks</ToolbarPageTitle>
          <ToolbarDescription>Tasks assigned to team members outside of workflows</ToolbarDescription>
        </ToolbarHeading>
        {canCreate('StandaloneTaskAdmin') && (
          <ToolbarActions>
            <Button onClick={() => setCreateOpen(true)}>Create Task</Button>
          </ToolbarActions>
        )}
      </Toolbar>

      <div className="flex items-center gap-4 mt-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-resolved"
            checked={showResolved}
            onCheckedChange={(checked) => setShowResolved(checked === true)}
          />
          <Label htmlFor="show-resolved" className="cursor-pointer">Show resolved</Label>
        </div>

        <div className="flex items-center gap-2 ml-2">
          {table.getColumn('taskStatus') && (
            <DataGridColumnFilter
              column={table.getColumn('taskStatus')}
              title="Status"
              options={STATUS_OPTIONS}
            />
          )}
          {table.getColumn('taskPriority') && (
            <DataGridColumnFilter
              column={table.getColumn('taskPriority')}
              title="Priority"
              options={PRIORITY_OPTIONS}
            />
          )}
          {table.getColumn('assignee') && (
            <DataGridColumnFilter
              column={table.getColumn('assignee')}
              title="Assignee"
              options={assigneeOptions}
            />
          )}
          {table.getColumn('taskSource') && (
            <DataGridColumnFilter
              column={table.getColumn('taskSource')}
              title="Source"
              options={SOURCE_OPTIONS}
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
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={tasks.length}
          isLoading={loading}
          emptyMessage="No tasks found."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          void loadTasks();
        }}
      />
    </div>
  );
}
