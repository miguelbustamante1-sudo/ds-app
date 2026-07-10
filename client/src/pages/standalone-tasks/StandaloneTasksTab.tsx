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
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { X } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { StandaloneTaskDTO } from '@shared/dto';
import { ResolveStandaloneTaskDrawer } from './components/ResolveStandaloneTaskDrawer';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

export function StandaloneTasksTab() {
  const { toast } = useToast();

  const [tasks, setTasks] = useState<StandaloneTaskDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<StandaloneTaskDTO[]>('/api/standalone-tasks/my-tasks');
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const columns = useMemo<ColumnDef<StandaloneTaskDTO>[]>(
    () => [
      {
        accessorKey: 'taskTitle',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        size: 220,
        meta: { headerTitle: 'Title', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'conductedWith',
        header: 'With',
        cell: ({ row }) => {
          const t = row.original;
          if (!t.hierarchyContextNames) return <span className="text-muted-foreground">—</span>;
          return `${t.hierarchyContextNames} ${t.hierarchyContextSurnames}`;
        },
        size: 180,
        meta: { headerTitle: 'With', skeleton: <Skeleton className="h-4 w-32" /> },
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
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setSelectedTaskId(row.original.taskId);
                setDrawerOpen(true);
              }}
            >
              Resolve
            </Button>
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

  const isFiltered = columnFilters.length > 0;

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        {table.getColumn('taskPriority') && (
          <DataGridColumnFilter
            column={table.getColumn('taskPriority')}
            title="Priority"
            options={PRIORITY_OPTIONS}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={tasks.length}
          isLoading={loading}
          emptyMessage="No pending tasks assigned to you."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <ResolveStandaloneTaskDrawer
        taskId={selectedTaskId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onResolved={loadTasks}
      />
    </>
  );
}
