import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import type { EndorsementWithDetailsDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUTCDate } from '@/lib/utils';
import { useEndorsements } from './components/useEndorsements';

export function EndorsementsPage() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { endorsements, loading, loadEndorsements } = useEndorsements();

  useEffect(() => {
    loadEndorsements();
  }, []);

  const columns = useMemo<ColumnDef<EndorsementWithDetailsDTO>[]>(
    () => [
      {
        id: 'candidateName',
        accessorFn: (row) => `${row.candidateFirstName} ${row.candidateLastName}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Candidate" />,
        size: 200,
        meta: { headerTitle: 'Candidate', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'positionName',
        accessorFn: (row) => row.position?.posName ?? '—',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Position" />,
        size: 200,
        meta: { headerTitle: 'Position', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'projectName',
        accessorFn: (row) => row.project?.projectName ?? '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        size: 250,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => row.original.startDate ? formatUTCDate(row.original.startDate) : '-',
        size: 150,
        enableGlobalFilter: false,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: endorsements,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Endorsements</ToolbarPageTitle>
          <ToolbarDescription>Manage candidate endorsements</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={() => navigate('/hiring/wizard')}>
            <Plus size={16} className="me-1" />
            New Endorsement
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search endorsements..."
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
          emptyMessage="No pending endorsements found."
          onRowClick={(row) => navigate(`/endorsements/${row.endorsementId}`)}
          tableLayout={{
            width: 'fixed',
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
