import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowLeft, AlertCircle, Download, Loader2 } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getReport, executeReport, downloadReport } from '../api';
import { ParameterForm } from './ParameterForm';
import type { ReportDefinitionDTO, ExecuteResponseDTO } from '@shared/dto/DynamicReport';

const DEFAULT_PAGE_SIZE = 25;

export function RunReportPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [report, setReport] = useState<ReportDefinitionDTO | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [result, setResult] = useState<ExecuteResponseDTO | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastParams, setLastParams] = useState<Record<string, string | number | boolean | null>>({});

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    if (!id) return;
    getReport(Number(id))
      .then(setReport)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load report', variant: 'destructive' });
        navigate('/reports');
      })
      .finally(() => setLoadingReport(false));
  }, [id]);

  async function handleRun(params: Record<string, string | number | boolean | null>) {
    if (!id) return;
    setLastParams(params);
    setIsRunning(true);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    try {
      const res = await executeReport(Number(id), params, 0, pagination.pageSize);
      setResult(res);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to run report', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  }

  async function handlePageChange(newPagination: PaginationState) {
    if (!id || !result) return;
    setPagination(newPagination);
    setIsRunning(true);
    try {
      const res = await executeReport(Number(id), lastParams, newPagination.pageIndex, newPagination.pageSize);
      setResult(res);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to load page', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    if (!id || !result) return;
    setIsExporting(true);
    try {
      const res = await downloadReport(Number(id), lastParams);
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(res.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const today = new Date().toISOString().split('T')[0];
      const filename = `${report?.reportName ?? 'report'}-${today}.${format}`;
      XLSX.writeFile(wb, filename, { bookType: format });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }

  // Build dynamic columns from result data
  const columns: ColumnDef<Record<string, unknown>>[] = result?.data[0]
    ? Object.keys(result.data[0]).map((key) => ({
        accessorKey: key,
        header: ({ column }) => <DataGridColumnHeader column={column} title={key} />,
        size: 160,
        cell: ({ getValue }) => {
          const val = getValue();
          if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
          const str = String(val);
          return (
            <span className="max-w-[160px] truncate block" title={str}>
              {str}
            </span>
          );
        },
      }))
    : [];

  const table = useReactTable({
    data: result?.data ?? [],
    columns,
    state: { sorting, pagination },
    pageCount: result ? Math.ceil(result.total / pagination.pageSize) : 0,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      handlePageChange(next);
    },
  });

  if (loadingReport) {
    return (
      <div className="container flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" />
              Reports
            </Button>
            <span className="text-muted-foreground">/</span>
            <div>
              <ToolbarPageTitle>{report.reportName}</ToolbarPageTitle>
              {report.reportDescription && (
                <ToolbarDescription>{report.reportDescription}</ToolbarDescription>
              )}
            </div>
          </div>
        </ToolbarHeading>
        {result && (
          <ToolbarActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Export XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ToolbarActions>
        )}
      </Toolbar>

      <div className="mt-6 space-y-4">
        {/* Parameter form */}
        <ParameterForm
          reportId={report.reportId}
          parameters={report.parameters}
          onSubmit={handleRun}
          isRunning={isRunning}
        />

        {/* Results */}
        {isRunning && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!isRunning && result && (
          <>
            <p className="text-sm text-muted-foreground">
              {result.total.toLocaleString()} record{result.total !== 1 ? 's' : ''} found
            </p>
            {result.data.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No results found for the selected parameters.
              </div>
            ) : (
              <DataGridContainer>
                <DataGrid
                  table={table}
                  recordCount={result.total}
                  tableLayout={{
                    headerBackground: true,
                    headerBorder: true,
                    rowBorder: true,
                    columnsVisibility: true,
                  }}
                >
                  <div className="overflow-x-auto">
                    <DataGridTable />
                  </div>
                  <DataGridPagination sizes={[25, 50, 100]} />
                </DataGrid>
              </DataGridContainer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
