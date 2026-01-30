import { useMemo } from 'react';
import { format } from 'date-fns';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
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
        size: 100,
        meta: { headerTitle: 'WDID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'teamMemberFullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Full Name" />,
        size: 200,
        meta: { headerTitle: 'Full Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'reportType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Report Type" />,
        cell: ({ row }) => (
          <Badge variant={row.original.reportType === 'Direct' ? 'info' : 'secondary'}>
            {row.original.reportType}
          </Badge>
        ),
        size: 100,
        meta: { headerTitle: 'Report Type', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'primaryRoleName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: ({ row }) => row.original.primaryRoleName || '-',
        size: 150,
        meta: { headerTitle: 'Role', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => row.original.countryName || '-',
        size: 120,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'supervisorAssignmentStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => format(new Date(row.original.supervisorAssignmentStartDate), 'MMM dd, yyyy'),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
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
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(newSorting);
    },
    onGlobalFilterChange: onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
          recordCount={teamMembers.length}
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
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
