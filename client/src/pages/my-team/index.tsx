import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState, ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';
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
import { Search, CalendarDays, Users, Globe, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMyTeamMembers, useTeamYearlySummary } from '@/hooks/useSupervisorTimeOff';

// Extended type with yearly time-off data and reconciliation flags
interface TeamMemberWithTimeOff extends SupervisedTeamMemberDTO {
  yearlyTimeOffDays: number;
  reconciliationFlags: string[];
}

export function MyTeamPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canRead } = usePermissions();
  const hasReportsAccess = canRead('Reports');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<number[]>([]);

  const { teamMembers, loading: loadingMembers, loadTeamMembers } = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { summaries, loading: loadingSummaries, loadSummaries } = useTeamYearlySummary({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { data: reconciliationRows = [] } = useQuery<WorkdayReconciliationRowDTO[]>({
    queryKey: ['reports', 'workday-reconciliation'],
    queryFn: () => apiGet<WorkdayReconciliationRowDTO[]>('/api/reports/time-off/workday-reconciliation'),
    staleTime: 60_000,
    enabled: hasReportsAccess,
  });

  const loading = loadingMembers || loadingSummaries;

  useEffect(() => {
    loadTeamMembers();
    loadSummaries();
  }, []);

  // workdayId → list of distinct reconciliation flags for that member
  const reconciliationFlagMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of reconciliationRows) {
      if (!row.workdayId || !row.reconciliationFlag) continue;
      const existing = map.get(row.workdayId) ?? [];
      if (!existing.includes(row.reconciliationFlag)) existing.push(row.reconciliationFlag);
      map.set(row.workdayId, existing);
    }
    return map;
  }, [reconciliationRows]);

  // Merge team members with yearly time-off data and reconciliation flags
  const teamMembersWithTimeOff = useMemo<TeamMemberWithTimeOff[]>(() => {
    const summaryMap = new Map(summaries.map((s) => [s.teamMemberId, s.totalDays]));
    return teamMembers.map((member) => ({
      ...member,
      yearlyTimeOffDays: summaryMap.get(member.teamMemberId) ?? 0,
      reconciliationFlags: member.workdayId ? (reconciliationFlagMap.get(member.workdayId) ?? []) : [],
    }));
  }, [teamMembers, summaries, reconciliationFlagMap]);

  // Unique sorted levels for the filter buttons
  const availableLevels = useMemo(
    () => [...new Set(teamMembersWithTimeOff.map((m) => m.reportLevel))].sort((a, b) => a - b),
    [teamMembersWithTimeOff]
  );

  // Apply level filter on top of the merged data
  const filteredByLevel = useMemo(
    () =>
      levelFilter.length === 0
        ? teamMembersWithTimeOff
        : teamMembersWithTimeOff.filter((m) => levelFilter.includes(m.reportLevel)),
    [teamMembersWithTimeOff, levelFilter]
  );

  const handleRowClick = (teamMember: TeamMemberWithTimeOff) => {
    navigate(`/my-team/${teamMember.teamMemberId}`);
  };

  const currentYear = new Date().getFullYear();

  const summaryCards = useMemo(() => {
    const total = teamMembersWithTimeOff.length;
    const countries = new Set(teamMembersWithTimeOff.map((m) => m.countryName).filter(Boolean)).size;
    const totalDays = teamMembersWithTimeOff.reduce((sum, m) => sum + m.yearlyTimeOffDays, 0);
    const avgDays = total > 0 ? Math.round(totalDays / total) : 0;
    const flaggedCount = teamMembersWithTimeOff.filter((m) => m.reconciliationFlags.length > 0).length;
    return { total, countries, avgDays, flaggedCount };
  }, [teamMembersWithTimeOff]);

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
        accessorKey: 'reportLevel',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Report Level" />,
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md border border-uds-system-blue-200 bg-uds-system-blue-50 px-2 py-0.5 text-xs font-medium text-uds-system-blue-700">
            Level {row.original.reportLevel}
          </span>
        ),
        size: 120,
        meta: { headerTitle: 'Report Level', skeleton: <Skeleton className="h-4 w-16" /> },
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
      {
        id: 'reconciliationFlags',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Discrepancies" />,
        cell: ({ row }) => {
          const flags = row.original.reconciliationFlags;
          if (!hasReportsAccess || flags.length === 0) return null;
          return (
            <span className="inline-flex items-center gap-1 rounded-md border border-uds-system-red-200 bg-uds-system-red-50 px-2 py-0.5 text-xs font-medium text-uds-system-red-700">
              <AlertTriangle className="h-3 w-3" />
              {flags.length} flag{flags.length > 1 ? 's' : ''}
            </span>
          );
        },
        size: 130,
        meta: { headerTitle: 'Discrepancies', skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [currentYear, hasReportsAccess]
  );

  const table = useReactTable({
    data: filteredByLevel,
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
            <div className={`grid gap-4 ${hasReportsAccess ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="rounded-full bg-uds-system-blue-50 p-2">
                  <Users className="h-5 w-5 text-uds-system-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.total}</p>
                  <p className="text-xs text-muted-foreground">Team Members</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="rounded-full bg-uds-system-green-50 p-2">
                  <Globe className="h-5 w-5 text-uds-system-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.countries}</p>
                  <p className="text-xs text-muted-foreground">Countries</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="rounded-full bg-uds-system-amber-50 p-2">
                  <TrendingUp className="h-5 w-5 text-uds-system-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.avgDays}</p>
                  <p className="text-xs text-muted-foreground">Avg. Days Off ({currentYear})</p>
                </div>
              </div>
              {hasReportsAccess && (
                <div
                  className={cn(
                    'rounded-lg border bg-card p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    summaryCards.flaggedCount > 0 && 'border-uds-system-red-300 bg-uds-system-red-50'
                  )}
                  onClick={() => navigate('/reports/time-off/workday-reconciliation')}
                  title="View Workday reconciliation report"
                >
                  <div className="rounded-full bg-uds-system-red-50 p-2">
                    <AlertTriangle className="h-5 w-5 text-uds-system-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground">{summaryCards.flaggedCount}</p>
                    <p className="text-xs text-muted-foreground">Workday Discrepancies</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              {availableLevels.length > 1 && (
                <ToggleGroup
                  type="multiple"
                  value={levelFilter.map(String)}
                  onValueChange={(vals) => setLevelFilter(vals.map(Number))}
                >
                  {availableLevels.map((level) => (
                    <ToggleGroupItem key={level} value={String(level)}>
                      Level {level}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
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
