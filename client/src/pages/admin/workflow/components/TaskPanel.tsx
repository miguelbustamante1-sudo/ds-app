import { useState, useMemo } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TaskFormDrawer } from './TaskFormDrawer';
import { TaskInputPanel } from './TaskInputPanel';
import { TaskOutcomePanel } from './TaskOutcomePanel';
import { TaskNotificationPanel } from './TaskNotificationPanel';
import type { WtkWorkflowTemplateTask } from '../types';

interface TaskPanelProps {
  wflId: string;
  tasks: WtkWorkflowTemplateTask[];
  onRefresh: () => void;
  isDraft: boolean;
}

function priorityBadge(priority: string) {
  if (priority === 'CRITICAL') return <Badge variant="destructive" appearance="light" size="sm">Critical</Badge>;
  if (priority === 'HIGH') return <Badge variant="warning" appearance="light" size="sm">High</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="primary" appearance="light" size="sm">Medium</Badge>;
  return <Badge variant="secondary" appearance="light" size="sm">Low</Badge>;
}

export function TaskPanel({ wflId, tasks, onRefresh, isDraft }: TaskPanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WtkWorkflowTemplateTask | undefined>();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleAdd = () => {
    setEditingTask(undefined);
    setDrawerOpen(true);
  };

  const handleEdit = (task: WtkWorkflowTemplateTask) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleDelete = async (wtkId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/tasks/${wtkId}`);
      toast({ title: 'Success', description: 'Task removed.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleRowClick = (wtkId: string) => {
    setExpandedTaskId((prev) => (prev === wtkId ? null : wtkId));
  };

  const columns = useMemo<ColumnDef<WtkWorkflowTemplateTask>[]>(
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
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 180,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'taskType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="outline" size="sm">{row.original.taskType}</Badge>,
        size: 90,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-5 w-16" /> },
      },
      {
        accessorKey: 'assignmentType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assignment" />,
        size: 110,
        meta: { headerTitle: 'Assignment', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
        cell: ({ row }) => priorityBadge(row.original.priority),
        size: 100,
        meta: { headerTitle: 'Priority', skeleton: <Skeleton className="h-5 w-16" /> },
      },
      {
        accessorKey: 'slaDurationHours',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SLA (h)" />,
        cell: ({ row }) => row.original.slaDurationHours ?? '-',
        size: 80,
        meta: { headerTitle: 'SLA (h)', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'isStartingTask',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Starting" />,
        cell: ({ row }) => (row.original.isStartingTask ? 'Yes' : 'No'),
        size: 80,
        meta: { headerTitle: 'Starting', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDraft ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row.original);
                }}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.original.wtkId);
                }}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ) : null,
        size: 80,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-16 ml-auto" />,
        },
      },
    ],
    [isDraft],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const expandedTask = tasks.find((t) => t.wtkId === expandedTaskId);

  return (
    <div className="space-y-4">
      {isDraft && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd}>
            <Plus size={14} className="me-1" />
            Add Task
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={tasks.length}
          isLoading={false}
          emptyMessage="No tasks defined. Add the first task to get started."
          onRowClick={(row) => handleRowClick(row.wtkId)}
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10, 25]} />
        </DataGrid>
      </DataGridContainer>

      {expandedTask && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-sm">
                Task Details: {expandedTask.code} — {expandedTask.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setExpandedTaskId(null)}>
                Close
              </Button>
            </div>

            <Tabs defaultValue="inputs">
              <TabsList variant="line">
                <TabsTrigger value="inputs">
                  Inputs
                  {(expandedTask.inputs?.length ?? 0) > 0 && (
                    <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      {expandedTask.inputs?.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outcomes">
                  Outcomes
                  {(expandedTask.outcomes?.length ?? 0) > 0 && (
                    <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      {expandedTask.outcomes?.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  Notifications
                  {(expandedTask.notifications?.length ?? 0) > 0 && (
                    <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      {expandedTask.notifications?.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inputs" className="mt-4">
                <TaskInputPanel
                  wflId={wflId}
                  task={expandedTask}
                  onRefresh={onRefresh}
                  isDraft={isDraft}
                />
              </TabsContent>

              <TabsContent value="outcomes" className="mt-4">
                <TaskOutcomePanel
                  wflId={wflId}
                  task={expandedTask}
                  onRefresh={onRefresh}
                  isDraft={isDraft}
                />
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                <TaskNotificationPanel
                  wflId={wflId}
                  task={expandedTask}
                  onRefresh={onRefresh}
                  isDraft={isDraft}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <TaskFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        wflId={wflId}
        task={editingTask}
        onSuccess={onRefresh}
      />
    </div>
  );
}
