import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { SortingState, ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMyTeamMembers, useTeamYearlySummary } from '@/hooks/useSupervisorTimeOff';

// Extended type with yearly time-off data
interface TeamMemberWithTimeOff extends SupervisedTeamMemberDTO {
  yearlyTimeOffDays: number;
}

export function MyTeamPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { teamMembers, loading: loadingMembers, loadTeamMembers } = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { summaries, loading: loadingSummaries, loadSummaries } = useTeamYearlySummary({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const loading = loadingMembers || loadingSummaries;

  useEffect(() => {
    loadTeamMembers();
    loadSummaries();
  }, []);

  // Merge team members with yearly time-off data
  const teamMembersWithTimeOff = useMemo<TeamMemberWithTimeOff[]>(() => {
    const summaryMap = new Map(summaries.map((s) => [s.teamMemberId, s.totalDays]));
    return teamMembers.map((member) => ({
      ...member,
      yearlyTimeOffDays: summaryMap.get(member.teamMemberId) ?? 0,
    }));
  }, [teamMembers, summaries]);

  const handleRowClick = (teamMember: TeamMemberWithTimeOff) => {
    navigate(`/my-team/${teamMember.teamMemberId}`);
  };

  const currentYear = new Date().getFullYear();

  const columns = useMemo<ColumnDef<TeamMemberWithTimeOff>[]>(
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
        id: 'fullName',
        accessorFn: (row) => row.teamMemberFullName,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Full Name" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.teamMemberFullName}</span>
            {row.original.teamMemberKnownAs && (
              <span className="text-xs text-muted-foreground">
                "{row.original.teamMemberKnownAs}"
              </span>
            )}
          </div>
        ),
        size: 200,
        meta: { headerTitle: 'Full Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'primaryRoleName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: ({ row }) => (
          <span>{row.original.primaryRoleName || '-'}</span>
        ),
        size: 180,
        meta: { headerTitle: 'Role', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => (
          <span>{row.original.countryName || '-'}</span>
        ),
        size: 120,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'reportType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Report Type" />,
        cell: ({ row }) => (
          <Badge variant={row.original.reportType === 'Direct' ? 'primary' : 'secondary'}>
            {row.original.reportType}
          </Badge>
        ),
        size: 120,
        meta: { headerTitle: 'Report Type', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'yearlyTimeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title={`Time Off (${currentYear})`} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original.yearlyTimeOffDays}</span>
            <span className="text-muted-foreground">days</span>
          </div>
        ),
        size: 140,
        meta: { headerTitle: `Time Off (${currentYear})`, skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [currentYear]
  );

  const table = useReactTable({
    data: teamMembersWithTimeOff,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
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
          <ToolbarPageTitle>My Team</ToolbarPageTitle>
          <ToolbarDescription>
            View your direct and indirect reports
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6">
        {loading ? (
          <div className="bg-card rounded-lg border p-6">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : teamMembersWithTimeOff.length === 0 ? (
          <div className="bg-card rounded-lg border">
            <div className="text-center py-12 text-muted-foreground">
              No team members found. You may not have any direct or indirect reports assigned.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={table.getFilteredRowModel().rows.length}
                onRowClick={handleRowClick}
                tableLayout={{
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
                tableClassNames={{
                  bodyRow: 'cursor-pointer hover:bg-muted/50',
                }}
              >
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          </div>
        )}
      </div>
    </div>
  );
}
