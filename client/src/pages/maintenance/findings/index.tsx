import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { BackToHubButton } from '@/components/BackToHubButton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPost } from '@/lib/api';
import { describeRule } from '@/lib/detection-rules';
import type {
  FindingDto,
  FindingStatusCountDto,
  RunFindingsResultDto,
  RunStateRulesResultDto,
} from '@shared/dto';

const CHANGE_TYPE_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  added: 'success',
  deleted: 'destructive',
  modified: 'warning',
};

const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'secondary' | 'warning'> = {
  open: 'primary',
  acknowledged: 'warning',
  approved: 'success',
  self_resolved: 'success',
  resolved_confirmed: 'success',
  superseded: 'secondary',
  rule_retired: 'secondary',
  dismissed: 'secondary',
};

// Statuses are whatever the data contains, so unknown values still render sensibly.
function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Both runs also create and close review tasks in the same request.
function taskSummary(result: { tasksCreated: number; tasksClosed: number }) {
  return `${result.tasksCreated} review tasks created, ${result.tasksClosed} closed`;
}

export function FindingsPage() {
  const [findings, setFindings] = useState<FindingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningRules, setIsRunningRules] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<RunFindingsResultDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>('open');
  const [statusCounts, setStatusCounts] = useState<FindingStatusCountDto[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadFindings = async (status: string | null) => {
    try {
      setLoading(true);
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiGet<FindingDto[]>(`/api/findings${query}`);
      setFindings(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load findings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      setStatusCounts(await apiGet<FindingStatusCountDto[]>('/api/findings/statuses'));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load finding statuses',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadFindings(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    loadStatuses();
  }, []);

  // The run itself succeeded; only the review-task step did not.
  const warnTaskSync = (taskSyncError: string | null) => {
    if (!taskSyncError) return;
    toast({
      title: 'Review tasks not updated',
      description: taskSyncError,
      variant: 'destructive',
    });
  };

  const handleRunFindings = async () => {
    setIsRunning(true);
    try {
      const result = await apiPost<RunFindingsResultDto>('/api/findings/run', {});
      setLastRunSummary(result);
      toast({
        title: 'Success',
        description: `Findings run completed: ${taskSummary(result)}`,
      });
      warnTaskSync(result.taskSyncError);
      await Promise.all([loadFindings(statusFilter), loadStatuses()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run findings',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunRules = async () => {
    setIsRunningRules(true);
    try {
      const result = await apiPost<RunStateRulesResultDto>('/api/findings/run-rules', {});
      toast({
        title: 'Success',
        description: `Rules run completed: ${result.violationsFound} violations found, ${result.findingsResolved} resolved; ${taskSummary(result)}`,
      });
      warnTaskSync(result.taskSyncError);
      await Promise.all([loadFindings(statusFilter), loadStatuses()]);
    } catch (error) {
      toast({
        title: 'Error',
        description: (error instanceof Error && error.message) || 'Failed to run rules',
        variant: 'destructive',
      });
    } finally {
      setIsRunningRules(false);
    }
  };

  const columns = useMemo<ColumnDef<FindingDto>[]>(
    () => [
      {
        accessorKey: 'fndEntityId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project ID" />,
        cell: ({ getValue }) => getValue() || '—',
        size: 120,
        meta: { headerTitle: 'Project ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'fieldDisplayName',
        accessorFn: (row) => row.fieldDisplayName ?? row.cdfFieldPath,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: ({ getValue }) => (getValue() as string | null) || '—',
        size: 160,
        meta: { headerTitle: 'Field', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'changeType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row, getValue }) => {
          // Rule-based findings (fn_run_state_rules) carry a rul_id and no change type.
          if (row.original.rulId !== null) {
            return (
              <Badge variant="info" appearance="light">
                Rule
              </Badge>
            );
          }
          const value = getValue() as string | null;
          if (!value) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant={CHANGE_TYPE_VARIANT[value] ?? 'secondary'} appearance="light">
              {humanize(value)}
            </Badge>
          );
        },
        size: 110,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'rule',
        accessorFn: (row) => (row.rulType ? describeRule(row.rulType, row.rulDefinition) : null),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rule" />,
        cell: ({ row, getValue }) => {
          const description = getValue() as string | null;
          if (!description) return <span className="text-muted-foreground">—</span>;
          return (
            <div>
              <div>{description}</div>
              <div className="text-xs text-muted-foreground">
                Rule #{row.original.rulId} · {row.original.rulType}
              </div>
            </div>
          );
        },
        size: 220,
        meta: { headerTitle: 'Rule', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'oldValue',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Old Value" />,
        cell: ({ getValue }) => {
          const value = getValue();
          if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
          const str = String(value);
          return <span title={str}>{str.substring(0, 100)}</span>;
        },
        size: 200,
        meta: { headerTitle: 'Old Value', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'newValue',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Value" />,
        cell: ({ row, getValue }) => {
          const value = getValue();
          if (value === null || value === undefined || (row.original.rulId !== null && value === '')) {
            return (
              <span className="text-muted-foreground">{row.original.rulId !== null ? '(missing)' : '—'}</span>
            );
          }
          const str = String(value);
          return <span title={str}>{str.substring(0, 100)}</span>;
        },
        size: 200,
        meta: { headerTitle: 'New Value', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'firstSeen',
        header: ({ column }) => <DataGridColumnHeader column={column} title="First Seen" />,
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return '—';
          return new Date(String(value)).toLocaleString();
        },
        size: 160,
        meta: { headerTitle: 'First Seen', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'lastSeen',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Last Seen" />,
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return '—';
          return new Date(String(value)).toLocaleString();
        },
        size: 160,
        meta: { headerTitle: 'Last Seen', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'occurrenceCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Occurrence Count" />,
        cell: ({ getValue }) => getValue() || 0,
        size: 140,
        meta: { headerTitle: 'Occurrence Count', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant={STATUS_VARIANT[value] ?? 'secondary'} appearance="light">
              {humanize(value)}
            </Badge>
          );
        },
        size: 130,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [],
  );

  const filterOptions = useMemo(() => {
    const options = [...statusCounts];
    if (statusFilter && !options.some((o) => o.status === statusFilter)) {
      options.push({ status: statusFilter, count: 0 });
    }
    return options;
  }, [statusCounts, statusFilter]);

  const table = useReactTable({
    data: findings,
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

  if (!canRead('Findings')) {
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
          <ToolbarPageTitle>Findings</ToolbarPageTitle>
          <ToolbarDescription>
            Monitor changes detected in watched fields across projects.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/maintenance-hub" />
          {canCreate('Findings') && (
            <Button variant="outline" onClick={handleRunRules} disabled={isRunning || isRunningRules}>
              {isRunningRules ? (
                <>
                  <Loader2 size={16} className="me-1 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Rules'
              )}
            </Button>
          )}
          {canCreate('Findings') && (
            <Button onClick={handleRunFindings} disabled={isRunning || isRunningRules}>
              {isRunning ? (
                <>
                  <Loader2 size={16} className="me-1 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Findings'
              )}
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      {lastRunSummary && (
        <Card className="mt-6">
          <CardContent>
            <CardTitle className="mb-4">Last Run Summary</CardTitle>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Findings Created</div>
                <div className="text-2xl font-bold">{lastRunSummary.findingsCreated}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Findings Updated</div>
                <div className="text-2xl font-bold">{lastRunSummary.findingsUpdated}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Entities Compared</div>
                <div className="text-2xl font-bold">{lastRunSummary.entitiesCompared}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fields Checked</div>
                <div className="text-2xl font-bold">{lastRunSummary.fieldsChecked}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === null ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(null)}
        >
          All
          <Badge variant="secondary" appearance="light" className="ms-2">
            {statusCounts.reduce((sum, s) => sum + s.count, 0)}
          </Badge>
        </Button>
        {filterOptions.map((option) => (
          <Button
            key={option.status}
            variant={statusFilter === option.status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(option.status)}
          >
            {humanize(option.status)}
            <Badge variant="secondary" appearance="light" className="ms-2">
              {option.count}
            </Badge>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading findings...</div>
      ) : (
        <DataGridContainer className="mt-6">
          <DataGrid
            table={table}
            recordCount={findings.length}
            isLoading={loading}
            emptyMessage="No findings detected."
            tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
          >
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
