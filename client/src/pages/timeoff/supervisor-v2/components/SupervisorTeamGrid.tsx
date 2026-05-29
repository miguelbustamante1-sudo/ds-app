import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { SupervisorTeamOverviewDTO } from '@shared/dto/SupervisorTeamOverview';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface SupervisorTeamGridProps {
  data: SupervisorTeamOverviewDTO[];
  loading: boolean;
}

function getActiveProjects(member: SupervisorTeamOverviewDTO): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const active = member.currentProjects.filter((p) => {
    const start = p.projectAssignmentStartDate ? new Date(p.projectAssignmentStartDate) : null;
    const end = p.projectAssignmentEndDate ? new Date(p.projectAssignmentEndDate) : null;
    const startOk = start === null || start <= today;
    const endOk = end === null || end >= today;
    return startOk && endOk;
  });
  return active.map((p) => p.projectExternalId ?? p.projectName).join(', ') || '—';
}

export function SupervisorTeamGrid({ data, loading }: SupervisorTeamGridProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const countryOptions = useMemo(() => {
    const unique = new Map<string, string>();
    data.forEach((m) => {
      if (m.countryIso) unique.set(m.countryIso, m.countryName ?? m.countryIso);
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [data]);

  const levelOptions = useMemo(() => {
    const unique = new Set<number>();
    data.forEach((m) => unique.add(m.reportLevel));
    return Array.from(unique)
      .sort((a, b) => a - b)
      .map((v) => ({ value: String(v), label: String(v) }));
  }, [data]);

  const columns = useMemo<ColumnDef<SupervisorTeamOverviewDTO>[]>(
    () => [
      {
        id: 'reportLevel',
        accessorFn: (row) => String(row.reportLevel),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Level" />,
        cell: ({ row }) => <span>{row.original.reportLevel}</span>,
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(String(row.original.reportLevel)),
        size: 70,
        meta: { headerTitle: 'Level', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.workdayId ?? '—'}</span>
        ),
        size: 110,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'name',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.teamMemberNames} {row.original.teamMemberSurnames}
          </span>
        ),
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'country',
        accessorFn: (row) => row.countryIso ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => <span>{row.original.countryIso ?? '—'}</span>,
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.countryIso ?? ''),
        size: 90,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        id: 'activeProjects',
        accessorFn: (row) => getActiveProjects(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: ({ row }) => <span>{getActiveProjects(row.original)}</span>,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'vacationBalance',
        accessorFn: (row) => row.vacationBalance ?? -1,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vacation Balance" />,
        cell: ({ row }) => {
          const balance = row.original.vacationBalance;
          if (balance === null) return <span className="text-muted-foreground">—</span>;
          const variant =
            balance <= 0
              ? 'bg-uds-system-red-100 text-uds-system-red-700'
              : balance < 5
                ? 'bg-uds-system-amber-100 text-uds-system-amber-700'
                : 'bg-uds-system-green-100 text-uds-system-green-700';
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variant}`}
            >
              {balance} days
            </span>
          );
        },
        size: 140,
        meta: { headerTitle: 'Vacation Balance', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
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
    <DataGridContainer>
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search by name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
          className="h-8 w-[200px]"
        />
        <DataGridColumnFilter
          column={table.getColumn('country')}
          title="Country"
          options={countryOptions}
        />
        <DataGridColumnFilter
          column={table.getColumn('reportLevel')}
          title="Level"
          options={levelOptions}
        />
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

      <DataGrid
        table={table}
        recordCount={table.getFilteredRowModel().rows.length}
        isLoading={loading}
        tableLayout={{ headerBackground: true, headerBorder: true, rowBorder: true }}
        onRowClick={(row) => navigate(`/supervisor-time-off-v2/${row.teamMemberId}`)}
      >
        <DataGridTable />
        <DataGridPagination sizes={[10, 25, 50]} />
      </DataGrid>
    </DataGridContainer>
  );
}
