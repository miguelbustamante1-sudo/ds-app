import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SupervisorCoverageDTO, CreateSupervisorCoverageDTO } from '@shared/dto';
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
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { apiPost } from '@/lib/api';
import { BackToHubButton } from '@/components/BackToHubButton';
import { Skeleton } from '@/components/ui/skeleton';
import { SupervisorCoverageFormDialog } from './form';

type CoverageStatus = 'Active' | 'Scheduled' | 'Ended';

const STATUS_OPTIONS: Array<{ label: string; value: CoverageStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Ended', value: 'Ended' },
];

const getCoverageStatus = (coverage: SupervisorCoverageDTO): CoverageStatus => {
  if (coverage.coverageEndedAt) return 'Ended';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseUTCDateAsLocal(coverage.coverageStartDate);
  if (start > today) return 'Scheduled';
  if (coverage.coverageEndDate && parseUTCDateAsLocal(coverage.coverageEndDate) < today) return 'Ended';
  return 'Active';
};

const formatDate = (date: Date | string | null) => (date ? formatUTCDate(String(date)) : '-');

const formatTeamMemberDisplay = (
  teamMember: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string },
) => {
  const name = `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;
  return teamMember.workdayId ? `${name} (${teamMember.workdayId})` : name;
};

export function SupervisorCoveragePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [endEarlyDialogOpen, setEndEarlyDialogOpen] = useState(false);
  const [endingCoverage, setEndingCoverage] = useState<SupervisorCoverageDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const coverage = useEntityList<SupervisorCoverageDTO, CreateSupervisorCoverageDTO, never>({
    endpoint: '/api/supervisor-coverage',
    idKey: 'supervisorCoverageId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    coverage.loadItems();
  }, []);

  const handleEndEarlyClick = (item: SupervisorCoverageDTO) => {
    setEndingCoverage(item);
    setEndEarlyDialogOpen(true);
  };

  const handleEndEarlyConfirm = async () => {
    if (!endingCoverage) return;

    try {
      await apiPost(`/api/supervisor-coverage/${endingCoverage.supervisorCoverageId}/end-early`, {});
      toast({ title: 'Success', description: 'Coverage ended' });
      coverage.loadItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to end coverage', variant: 'destructive' });
    } finally {
      setEndEarlyDialogOpen(false);
      setEndingCoverage(null);
    }
  };

  const columns = useMemo<ColumnDef<SupervisorCoverageDTO>[]>(
    () => [
      {
        id: 'fromSupervisor',
        accessorFn: (row) => formatTeamMemberDisplay(row.fromSupervisor),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Covered Supervisor" />,
        cell: ({ row }) => formatTeamMemberDisplay(row.original.fromSupervisor),
        size: 220,
        meta: { headerTitle: 'Covered Supervisor', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'toSupervisor',
        accessorFn: (row) => formatTeamMemberDisplay(row.toSupervisor),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Covering Supervisor" />,
        cell: ({ row }) => formatTeamMemberDisplay(row.original.toSupervisor),
        size: 220,
        meta: { headerTitle: 'Covering Supervisor', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'coverageStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.coverageStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'coverageEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.coverageEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'status',
        accessorFn: (row) => getCoverageStatus(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = getCoverageStatus(row.original);
          const variant = status === 'Active' ? 'success' : status === 'Scheduled' ? 'info' : 'secondary';
          return <Badge variant={variant}>{status}</Badge>;
        },
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(getCoverageStatus(row.original));
        },
        size: 110,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canCreate('SupervisorCoverage') && getCoverageStatus(row.original) !== 'Ended' ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleEndEarlyClick(row.original)}>
                End Early
              </Button>
            </div>
          ) : null,
        size: 120,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [canCreate],
  );

  const table = useReactTable({
    data: coverage.items,
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

  if (!canRead('SupervisorCoverage')) {
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
          <ToolbarPageTitle>Supervisor Coverage</ToolbarPageTitle>
          <ToolbarDescription>
            Manage temporary coverage arrangements between supervisors.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/maintenance-hub" />
          {canCreate('SupervisorCoverage') && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} className="me-1" />
              New Coverage
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('status') && (
          <DataGridColumnFilter column={table.getColumn('status')} title="Status" options={STATUS_OPTIONS} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={coverage.items.length}
          isLoading={coverage.loading}
          emptyMessage="No supervisor coverage records found."
          tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <SupervisorCoverageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          setFormOpen(false);
          coverage.loadItems();
        }}
      />

      <AlertDialog open={endEarlyDialogOpen} onOpenChange={setEndEarlyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {endingCoverage &&
                `This will end coverage where '${formatTeamMemberDisplay(endingCoverage.toSupervisor)}' is covering '${formatTeamMemberDisplay(endingCoverage.fromSupervisor)}'. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndEarlyConfirm}>End Early</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
