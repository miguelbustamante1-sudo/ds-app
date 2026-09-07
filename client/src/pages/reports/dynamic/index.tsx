import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getAllReports, deleteReport } from './api';
import type { ReportDefinitionSummaryDTO } from '@shared/dto/DynamicReport';

export function DynamicReportsManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const [reports, setReports] = useState<ReportDefinitionSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState<ReportDefinitionSummaryDTO | null>(null);

  function loadReports() {
    setLoading(true);
    getAllReports()
      .then(setReports)
      .catch(() => toast({ title: 'Error', description: 'Failed to load reports', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadReports(); }, []);

  function handleDeleteClick(report: ReportDefinitionSummaryDTO) {
    setDeletingReport(report);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingReport) return;
    try {
      await deleteReport(deletingReport.reportId);
      toast({ title: 'Success', description: 'Report deactivated' });
      loadReports();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to deactivate report', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingReport(null);
    }
  }

  const columns = useMemo<ColumnDef<ReportDefinitionSummaryDTO>[]>(
    () => [
      {
        accessorKey: 'reportName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.reportName}</span>
        ),
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        accessorKey: 'reportGroup',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Group" />,
        cell: ({ row }) => row.original.reportGroup,
        meta: { headerTitle: 'Group', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'reportActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (
          <Badge variant={row.original.reportActive ? 'success' : 'secondary'}>
            {row.original.reportActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
        size: 100,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-6 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Reports') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/reports/dynamic/${row.original.reportId}/edit`)}
              >
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('Reports') && row.original.reportActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(row.original)}
              >
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
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
    [canCreate, canDelete, navigate],
  );

  const table = useReactTable({
    data: reports,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('Reports')) {
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
          <ToolbarPageTitle>Manage Dynamic Reports</ToolbarPageTitle>
          <ToolbarDescription>Create and manage custom SQL-based reports</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Reports') && (
            <Button onClick={() => navigate('/reports/dynamic/new')}>
              <Plus size={16} className="me-1" />
              New Report
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No reports found. Create your first report to get started."
          tableLayout={{
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate "{deletingReport?.reportName}" and hide it from the Reports Hub.
              The report data is preserved and can be reactivated via the edit wizard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
