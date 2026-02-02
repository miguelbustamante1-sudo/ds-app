import { useMemo } from 'react';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface TeamMembersDataGridProps {
  teamMembers: SupervisedTeamMemberDTO[];
  loading: boolean;
  selectedTeamMemberId: number | null;
  onSelectTeamMember: (teamMember: SupervisedTeamMemberDTO) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  globalFilter: string;
  onGlobalFilterChange: (filter: string) => void;
}

export function TeamMembersDataGrid({
  teamMembers,
  loading,
  selectedTeamMemberId,
  onSelectTeamMember,
  sorting,
  onSortingChange,
  globalFilter,
  onGlobalFilterChange,
}: TeamMembersDataGridProps) {
  const columns = useMemo<ColumnDef<SupervisedTeamMemberDTO>[]>(
    () => [
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="WDID" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.workdayId || '-'}</span>
        ),
        size: 80,
        meta: { headerTitle: 'WDID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'fullName',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Full Name" />,
        cell: ({ row }) => (
          <span>{row.original.teamMemberNames} {row.original.teamMemberSurnames}</span>
        ),
        size: 180,
        meta: { headerTitle: 'Full Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
    ],
    []
  );

  const table = useReactTable({
    data: teamMembers,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(newSorting);
    },
    onGlobalFilterChange: onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="bg-card rounded-lg border">
        <div className="text-center py-12 text-muted-foreground">
          No team members found. You may not have any direct or indirect reports assigned.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Data Grid */}
      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          onRowClick={onSelectTeamMember}
          tableLayout={{
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
          tableClassNames={{
            bodyRow: 'cursor-pointer hover:bg-muted/50',
          }}
          getRowClassName={(row) =>
            row.teamMemberId === selectedTeamMemberId
              ? 'bg-primary/10 hover:bg-primary/20'
              : ''
          }
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
