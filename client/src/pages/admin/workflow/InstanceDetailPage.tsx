import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ColumnDef,
  getCoreRowModel,
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
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { AdminJumpModal } from './components/AdminJumpModal';
import { AdminForceCompleteModal } from './components/AdminForceCompleteModal';
import { AdminDestroyModal } from './components/AdminDestroyModal';
import { ReassignTaskModal } from '@/pages/workflow/components/ReassignTaskModal';
import type { WinWorkflowInstance, WitAdminTask, WalAuditEntry } from './types';

function instanceStatusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (status === 'COMPLETED') return <Badge variant="primary" appearance="light">Completed</Badge>;
  if (status === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  if (status === 'DESTROYED') return <Badge variant="secondary" appearance="light">Destroyed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function taskStateBadge(state: string) {
  if (state === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (state === 'PENDING') return <Badge variant="secondary" appearance="light">Pending</Badge>;
  if (state === 'SUCCESS') return <Badge variant="primary" appearance="light">Success</Badge>;
  if (state === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  if (state === 'OVERRIDDEN') return <Badge variant="warning" appearance="light">Overridden</Badge>;
  if (state === 'VOIDED') return <Badge variant="outline">Voided</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

export function InstanceDetailPage() {
  const { winId } = useParams<{ winId: string }>();
  const navigate = useNavigate();
  const { canRead, canCreate } = usePermissions();
  const { toast } = useToast();

  const [instance, setInstance] = useState<WinWorkflowInstance | null>(null);
  const [auditLog, setAuditLog] = useState<WalAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WitAdminTask | null>(null);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);

  const [jumpOpen, setJumpOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const [taskSorting, setTaskSorting] = useState<SortingState>([]);
  const [auditSorting, setAuditSorting] = useState<SortingState>([]);

  const loadData = useCallback(async () => {
    if (!winId) return;
    setLoading(true);
    try {
      const [inst, audit] = await Promise.all([
        apiGet<WinWorkflowInstance>(`/api/workflow/instances/${winId}`),
        apiGet<WalAuditEntry[]>(`/api/workflow/instances/${winId}/audit-log`),
      ]);
      setInstance(inst);
      setAuditLog(audit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load instance';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [winId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingTasks = useMemo(
    () => (instance?.tasks ?? []).filter((t) => t.state === 'PENDING'),
    [instance],
  );

  const taskColumns = useMemo<ColumnDef<WitAdminTask>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
        size: 130,
        meta: { headerTitle: 'Code', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'state',
        header: ({ column }) => <DataGridColumnHeader column={column} title="State" />,
        cell: ({ row }) => taskStateBadge(row.original.state),
        size: 120,
        meta: { headerTitle: 'State', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'assignmentType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assignment" />,
        size: 120,
        meta: { headerTitle: 'Assignment', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'assignedUserId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assigned To" />,
        cell: ({ row }) => row.original.assignedUserId ?? '—',
        size: 160,
        meta: { headerTitle: 'Assigned To', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'dueAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Due At" />,
        cell: ({ row }) => (row.original.dueAt ? formatUTCDate(row.original.dueAt) : '—'),
        size: 120,
        meta: { headerTitle: 'Due At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'completedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Completed At" />,
        cell: ({ row }) =>
          row.original.completedAt ? formatUTCDate(row.original.completedAt) : '—',
        size: 130,
        meta: { headerTitle: 'Completed At', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'outcomeCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Outcome" />,
        cell: ({ row }) => row.original.outcomeCode ?? '—',
        size: 110,
        meta: { headerTitle: 'Outcome', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'overriddenBy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Overridden By" />,
        cell: ({ row }) => row.original.overriddenBy ?? '—',
        size: 140,
        meta: { headerTitle: 'Overridden By', skeleton: <Skeleton className="h-4 w-28" /> },
      },
    ],
    [],
  );

  const auditColumns = useMemo<ColumnDef<WalAuditEntry>[]>(
    () => [
      {
        accessorKey: 'eventTimestamp',
        header: 'Timestamp',
        cell: ({ row }) => formatUTCDate(row.original.eventTimestamp),
        size: 130,
        meta: { headerTitle: 'Timestamp', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'eventType',
        header: 'Event Type',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.eventType}</span>,
        size: 160,
        meta: { headerTitle: 'Event Type', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'performedBy',
        header: 'Performed By',
        cell: ({ row }) => row.original.performedBy ?? '—',
        size: 220,
        meta: { headerTitle: 'Performed By', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'witId',
        header: 'Task ID',
        cell: ({ row }) =>
          row.original.witId ? (
            <span className="font-mono text-xs">{row.original.witId.slice(0, 8)}</span>
          ) : (
            '—'
          ),
        size: 100,
        meta: { headerTitle: 'Task ID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'oldState',
        header: 'Old State',
        cell: ({ row }) => row.original.oldState ?? '—',
        size: 110,
        meta: { headerTitle: 'Old State', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'newState',
        header: 'New State',
        cell: ({ row }) => row.original.newState ?? '—',
        size: 110,
        meta: { headerTitle: 'New State', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => row.original.reason ?? '—',
        size: 280,
        meta: { headerTitle: 'Reason', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'error',
        header: 'Error',
        cell: ({ row }) => {
          const details = row.original.detailsJson as { errorMessage?: string } | null;
          return details?.errorMessage ? (
            <span className="text-destructive">{details.errorMessage}</span>
          ) : (
            '—'
          );
        },
        size: 320,
        meta: { headerTitle: 'Error', skeleton: <Skeleton className="h-4 w-40" /> },
      },
    ],
    [],
  );

  const taskTable = useReactTable({
    data: instance?.tasks ?? [],
    columns: taskColumns,
    state: { sorting: taskSorting },
    onSortingChange: setTaskSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.witId,
  });

  const auditTable = useReactTable({
    data: auditLog,
    columns: auditColumns,
    state: { sorting: auditSorting },
    onSortingChange: setAuditSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.walId,
  });

  if (!canRead('WorkflowAdmin')) {
    return null;
  }

  const handleModalSuccess = () => {
    setJumpOpen(false);
    setForceOpen(false);
    setDestroyOpen(false);
    void loadData();
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Instance Detail</ToolbarPageTitle>
          <ToolbarDescription>
            {instance ? instance.workflowCode : 'Loading...'}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/admin/workflow/instances')}>
            Back to List
          </Button>
        </ToolbarActions>
      </Toolbar>

      {loading && !instance ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : instance ? (
        <div className="space-y-6 mt-6">
          {/* Instance Header Card */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Instance: {instance.name}</CardTitle>
                {instance.status === 'ACTIVE' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setJumpOpen(true)}>
                      Jump to Task
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setForceOpen(true)}>
                      Force Complete
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDestroyOpen(true)}>
                      Destroy
                    </Button>
                  </div>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Workflow Code</dt>
                  <dd className="font-mono">{instance.workflowCode}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{instanceStatusBadge(instance.status)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Started At</dt>
                  <dd>{formatUTCDate(instance.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Started By</dt>
                  <dd>{instance.startedBy ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd>v{instance.templateVersionNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Owner User ID</dt>
                  <dd className="font-mono text-xs">{instance.ownerUserId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ref. Type</dt>
                  <dd>{instance.businessReferenceType ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ref. ID</dt>
                  <dd>{instance.businessReferenceId ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardContent>
              <CardTitle className="mb-4">Tasks</CardTitle>
              <div className="overflow-x-auto">
                <div className="min-w-[1300px]">
                  <DataGridContainer>
                    <DataGrid
                      table={taskTable}
                      recordCount={instance.tasks?.length ?? 0}
                      isLoading={loading}
                      emptyMessage="No tasks found."
                      onRowClick={(row) => {
                        setSelectedTask(row);
                        setTaskSheetOpen(true);
                      }}
                      tableLayout={{
                        width: 'fixed',
                        columnsResizable: true,
                        columnsMovable: true,
                        columnsVisibility: true,
                      }}
                    >
                      <DataGridTable />
                    </DataGrid>
                  </DataGridContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardContent>
              <CardTitle className="mb-4">Audit Trail</CardTitle>
              <div className="overflow-x-auto">
                <div className="min-w-[1500px]">
                  <DataGridContainer>
                    <DataGrid
                      table={auditTable}
                      recordCount={auditLog.length}
                      isLoading={loading}
                      emptyMessage="No audit events found."
                      tableLayout={{
                        width: 'fixed',
                        columnsResizable: true,
                        columnsMovable: true,
                        columnsVisibility: true,
                      }}
                    >
                      <DataGridTable />
                    </DataGrid>
                  </DataGridContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Task Detail Sheet */}
      <Sheet open={taskSheetOpen} onOpenChange={setTaskSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedTask ? `${selectedTask.code} — ${selectedTask.name}` : 'Task Detail'}
            </SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="mt-4 space-y-3 text-sm">
              {/* Reassignment is an admin override and lives here rather than in the task
                  execution drawer, where the assignee only sees their task's outcomes.
                  Only meaningful while the task is still ACTIVE. */}
              {selectedTask.state === 'ACTIVE' && canCreate('WorkflowAdmin') && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
                    Reassign
                  </Button>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-muted-foreground">State</dt>
                  <dd>{taskStateBadge(selectedTask.state)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Task Type</dt>
                  <dd>{selectedTask.taskType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assignment Type</dt>
                  <dd>{selectedTask.assignmentType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd>{selectedTask.priority}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assigned User ID</dt>
                  <dd className="font-mono text-xs">{selectedTask.assignedUserId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Resolved User ID</dt>
                  <dd className="font-mono text-xs">{selectedTask.resolvedUserId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due At</dt>
                  <dd>{selectedTask.dueAt ? formatUTCDate(selectedTask.dueAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Activated At</dt>
                  <dd>
                    {selectedTask.activatedAt ? formatUTCDate(selectedTask.activatedAt) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Completed At</dt>
                  <dd>
                    {selectedTask.completedAt ? formatUTCDate(selectedTask.completedAt) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Completed By</dt>
                  <dd>{selectedTask.completedBy ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Outcome</dt>
                  <dd>{selectedTask.outcomeCode ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Retry Count</dt>
                  <dd>
                    {selectedTask.retryCount} / {selectedTask.maxRetryCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Overridden By</dt>
                  <dd>{selectedTask.overriddenBy ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Override Reason</dt>
                  <dd>{selectedTask.overrideReason ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Voided By</dt>
                  <dd>{selectedTask.voidedBy ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">SLA Duration (hrs)</dt>
                  <dd>{selectedTask.slaDurationHours ?? '—'}</dd>
                </div>
              </dl>
              {selectedTask.description && (
                <div>
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="mt-1">{selectedTask.description}</dd>
                </div>
              )}
              {selectedTask.resultComment && (
                <div>
                  <dt className="text-muted-foreground">Result Comment</dt>
                  <dd className="mt-1">{selectedTask.resultComment}</dd>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Admin Modals */}
      {winId && (
        <>
          <AdminJumpModal
            winId={winId}
            pendingTasks={pendingTasks}
            open={jumpOpen}
            onOpenChange={setJumpOpen}
            onSuccess={handleModalSuccess}
          />
          <AdminForceCompleteModal
            winId={winId}
            open={forceOpen}
            onOpenChange={setForceOpen}
            onSuccess={handleModalSuccess}
          />
          <AdminDestroyModal
            winId={winId}
            open={destroyOpen}
            onOpenChange={setDestroyOpen}
            onSuccess={handleModalSuccess}
          />
          {selectedTask && (
            <ReassignTaskModal
              witId={selectedTask.witId}
              winId={winId}
              open={reassignOpen}
              onOpenChange={setReassignOpen}
              requireReason
              onSuccess={() => {
                setReassignOpen(false);
                setTaskSheetOpen(false);
                void loadData();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
