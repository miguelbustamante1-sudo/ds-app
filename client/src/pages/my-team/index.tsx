import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState, ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Globe, TrendingUp, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet } from '@/lib/api';
import { cn, formatUTCDate } from '@/lib/utils';
import { useMyTeamMembers, useTeamYearlySummary } from '@/hooks/useSupervisorTimeOff';

// Extended type with yearly time-off data and reconciliation flags
interface TeamMemberWithTimeOff extends SupervisedTeamMemberDTO {
  yearlyTimeOffDays: number;
  reconciliationFlags: string[];
}

const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  return formatUTCDate(String(date));
};

export function MyTeamPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canRead } = usePermissions();
  const hasReportsAccess = canRead('Reports');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showInactive, setShowInactive] = useState<boolean>(
    () => sessionStorage.getItem('my-team-show-inactive') === 'true'
  );

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

  // Active/inactive split — active means no end date (Rule: strict null check)
  const visibleTeamMembers = useMemo(
    () =>
      showInactive
        ? teamMembersWithTimeOff
        : teamMembersWithTimeOff.filter((m) => m.teamMemberEndDate === null),
    [teamMembersWithTimeOff, showInactive]
  );

  // Dynamic filter options, derived from the currently visible (active/inactive-toggled) set
  const roleOptions = useMemo(() => {
    const unique = new Set<string>();
    visibleTeamMembers.forEach((m) => {
      if (m.primaryRoleName) unique.add(m.primaryRoleName);
    });
    return Array.from(unique)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [visibleTeamMembers]);

  const countryOptions = useMemo(() => {
    const unique = new Set<string>();
    visibleTeamMembers.forEach((m) => {
      if (m.countryName) unique.add(m.countryName);
    });
    return Array.from(unique)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [visibleTeamMembers]);

  const levelOptions = useMemo(() => {
    const unique = new Set<number>();
    visibleTeamMembers.forEach((m) => unique.add(m.reportLevel));
    return Array.from(unique)
      .sort((a, b) => a - b)
      .map((level) => ({ value: String(level), label: `Level ${level}` }));
  }, [visibleTeamMembers]);

  const handleRowClick = (teamMember: TeamMemberWithTimeOff) => {
    navigate(`/my-team/${teamMember.teamMemberId}`);
  };

  const currentYear = new Date().getFullYear();

  const summaryCards = useMemo(() => {
    const total = visibleTeamMembers.length;
    const countries = new Set(visibleTeamMembers.map((m) => m.countryName).filter(Boolean)).size;
    const totalDays = visibleTeamMembers.reduce((sum, m) => sum + m.yearlyTimeOffDays, 0);
    const avgDays = total > 0 ? Math.round(totalDays / total) : 0;
    const flaggedCount = visibleTeamMembers.filter((m) => m.reconciliationFlags.length > 0).length;
    return { total, countries, avgDays, flaggedCount };
  }, [visibleTeamMembers]);

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
        filterFn: (row, _id, filterValues: string[]) =>
          filterValues.includes(row.original.primaryRoleName ?? ''),
        size: 180,
        meta: { headerTitle: 'Role', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => (
          <span>{row.original.countryName || '-'}</span>
        ),
        filterFn: (row, _id, filterValues: string[]) =>
          filterValues.includes(row.original.countryName ?? ''),
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
        filterFn: (row, _id, filterValues: string[]) =>
          filterValues.includes(String(row.original.reportLevel)),
        size: 120,
        meta: { headerTitle: 'Report Level', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'teamMemberEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.teamMemberEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
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
    data: visibleTeamMembers,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
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
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Members</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Countries</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.countries}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg. Days Off ({currentYear})</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summaryCards.avgDays}</p>
                </CardContent>
              </Card>
              {hasReportsAccess && (
                <Card
                  className={cn(
                    'cursor-pointer hover:bg-muted/50 transition-colors',
                    summaryCards.flaggedCount > 0 && 'border-uds-system-red-300 bg-uds-system-red-50'
                  )}
                  onClick={() => navigate('/reports/time-off/workday-reconciliation')}
                  title="View Workday reconciliation report"
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workday Discrepancies</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{summaryCards.flaggedCount}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-inactive-members"
                checked={showInactive}
                onCheckedChange={(checked) => {
                  const value = checked === true;
                  setShowInactive(value);
                  sessionStorage.setItem('my-team-show-inactive', String(value));
                }}
              />
              <Label
                htmlFor="show-inactive-members"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Inactive Members
              </Label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search by WDID..."
                value={(table.getColumn('workdayId')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('workdayId')?.setFilterValue(e.target.value)}
                className="h-8 w-[160px]"
              />
              <Input
                placeholder="Search by name..."
                value={(table.getColumn('fullName')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('fullName')?.setFilterValue(e.target.value)}
                className="h-8 w-[200px]"
              />
              {table.getColumn('primaryRoleName') && (
                <DataGridColumnFilter
                  column={table.getColumn('primaryRoleName')}
                  title="Role"
                  options={roleOptions}
                />
              )}
              {table.getColumn('countryName') && (
                <DataGridColumnFilter
                  column={table.getColumn('countryName')}
                  title="Country"
                  options={countryOptions}
                />
              )}
              {table.getColumn('reportLevel') && (
                <DataGridColumnFilter
                  column={table.getColumn('reportLevel')}
                  title="Report Level"
                  options={levelOptions}
                />
              )}
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

            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={visibleTeamMembers.length}
                emptyMessage="No active team members match the current filters. Try enabling &quot;Show Inactive Members&quot;."
                onRowClick={handleRowClick}
                tableLayout={{
                  columnsResizable: true,
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
