import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Toolbar, ToolbarHeading, ToolbarPageTitle, ToolbarActions } from '@/components/ui/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
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
import { BackToHubButton } from '@/components/BackToHubButton';
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAllCases, deleteCase } from '@/api/performanceCases';
import { CreateCaseDialog } from './CreateCaseDialog';
import type { PerformanceCaseDTO } from '@shared/dto';

const SEVERITY_TIER_OPTIONS = [
  { label: 'Standard', value: 'STANDARD' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const CURRENT_PHASE_OPTIONS = [
  { label: 'Phase 0', value: 'PHASE_0' },
  { label: 'Phase 1', value: 'PHASE_1' },
  { label: 'Phase 2', value: 'PHASE_2' },
  { label: 'Phase 3', value: 'PHASE_3' },
  { label: 'Phase 4', value: 'PHASE_4' },
  { label: 'Phase 5', value: 'PHASE_5' },
  { label: 'Phase 6', value: 'PHASE_6' },
  { label: 'Post-Closure', value: 'POST_CLOSURE' },
];

const CASE_STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed — Successful', value: 'CLOSED_SUCCESSFUL' },
  { label: 'Closed — Escalated', value: 'CLOSED_ESCALATED' },
  { label: 'Regressed', value: 'REGRESSED' },
];

// A case can only be deleted while it's still sitting in creation — no phase advancement,
// sign-offs, check-ins, or closure activity has happened yet. Enforced again server-side.
function isDeletable(perfCase: PerformanceCaseDTO): boolean {
  return perfCase.currentPhase === 'PHASE_0' && perfCase.caseStatus === 'ACTIVE';
}

export function PerformanceCasesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [rows, setRows] = useState<PerformanceCaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState<PerformanceCaseDTO | null>(null);

  function loadCases() {
    setLoading(true);
    getAllCases()
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCases();
  }, []);

  function handleDeleteClick(perfCase: PerformanceCaseDTO) {
    setDeletingCase(perfCase);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingCase) return;
    try {
      await deleteCase(deletingCase.caseId);
      toast({ title: 'Case removed' });
      loadCases();
    } catch (err) {
      toast({ title: 'Failed to remove case', description: String(err), variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCase(null);
    }
  }

  const columns = useMemo<ColumnDef<PerformanceCaseDTO>[]>(
    () => [
      {
        accessorKey: 'caseCode',
        header: ({ column }) => <DataGridColumnHeader title="Case" column={column} />,
        cell: ({ row }) => (
          <button onClick={() => navigate(`/performance-cases/${row.original.caseId}`)} className="underline">
            {row.original.caseCode}
          </button>
        ),
      },
      {
        accessorKey: 'severityTier',
        header: ({ column }) => <DataGridColumnHeader title="Tier" column={column} />,
        filterFn: (row, _id, value: string[]) => value.includes(row.original.severityTier),
      },
      {
        accessorKey: 'currentPhase',
        header: ({ column }) => <DataGridColumnHeader title="Phase" column={column} />,
        filterFn: (row, _id, value: string[]) => value.includes(row.original.currentPhase),
      },
      {
        accessorKey: 'caseStatus',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) =>
          row.original.caseStatus === 'CLOSED_ESCALATED' ? (
            <Badge variant="destructive">Closed — Escalated</Badge>
          ) : (
            row.original.caseStatus
          ),
        filterFn: (row, _id, value: string[]) => value.includes(row.original.caseStatus),
      },
      {
        accessorKey: 'createdDate',
        header: ({ column }) => <DataGridColumnHeader title="Created" column={column} />,
        cell: ({ row }) => formatUTCDate(row.original.createdDate),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDeletable(row.original) ? (
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          ) : null,
        enableSorting: false,
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Performance Cases</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/performance-management-hub" />
          <Button onClick={() => setCreateOpen(true)}>New Performance Case</Button>
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search case code..."
          value={(table.getColumn('caseCode')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('caseCode')?.setFilterValue(e.target.value)}
          className="h-8 w-[180px]"
        />
        {table.getColumn('severityTier') && (
          <DataGridColumnFilter column={table.getColumn('severityTier')} title="Tier" options={SEVERITY_TIER_OPTIONS} />
        )}
        {table.getColumn('currentPhase') && (
          <DataGridColumnFilter column={table.getColumn('currentPhase')} title="Phase" options={CURRENT_PHASE_OPTIONS} />
        )}
        {table.getColumn('caseStatus') && (
          <DataGridColumnFilter column={table.getColumn('caseStatus')} title="Status" options={CASE_STATUS_OPTIONS} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer className="mt-4">
          <DataGrid table={table} recordCount={rows.length}>
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}

      <CreateCaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(caseId) => navigate(`/performance-cases/${caseId}`)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete case "{deletingCase?.caseCode}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
