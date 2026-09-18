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
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card-title';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { BackToHubButton } from '@/components/BackToHubButton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPost } from '@/lib/api';
import type { FindingDto, RunFindingsResultDto } from '@shared/dto';

export function FindingsPage() {
  const [findings, setFindings] = useState<FindingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<RunFindingsResultDto | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadFindings = async () => {
    try {
      setLoading(true);
      const data = await apiGet<FindingDto[]>('/api/findings');
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

  useEffect(() => {
    loadFindings();
  }, []);

  const handleRunFindings = async () => {
    setIsRunning(true);
    try {
      const result = await apiPost<RunFindingsResultDto>('/api/findings/run', {});
      setLastRunSummary(result);
      toast({
        title: 'Success',
        description: 'Findings run completed',
      });
      await loadFindings();
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
        accessorKey: 'fieldDisplayName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: ({ getValue }) => getValue() || '—',
        size: 160,
        meta: { headerTitle: 'Field', skeleton: <Skeleton className="h-4 w-32" /> },
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
        cell: ({ getValue }) => {
          const value = getValue();
          if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
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
    ],
    [],
  );

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
            <Button onClick={handleRunFindings} disabled={isRunning}>
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
