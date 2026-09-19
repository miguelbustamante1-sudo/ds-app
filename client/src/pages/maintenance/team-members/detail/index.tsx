import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, CalendarDays, CalendarArrowDown } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMaintenanceTeamMemberProfile } from '@/hooks/useMaintenanceTeamMemberProfile';
import { apiGet } from '@/lib/api';
import { getShifts, type ShiftDTO } from '@/services/shift';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TeamMemberDTO, CountryDTO, PositionDTO, TierBandDTO } from '@shared/dto';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import { ProjectsSection } from '@/pages/my-profile/components/ProjectsSection';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { WorkInfoSection } from './sections/WorkInfoSection';
import { LocationSection } from './sections/LocationSection';
import { DatesSection } from './sections/DatesSection';
import { IdentifiersSection } from './sections/IdentifiersSection';

function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const s = statusName.toLowerCase();
  if (s.includes('approved') || s.includes('acknowledged')) return 'success';
  if (s.includes('tentative') || s.includes('pending')) return 'secondary';
  if (s.includes('cancelled') || s.includes('rejected')) return 'destructive';
  return 'outline';
}

export function MaintenanceTeamMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const teamMemberId = parseInt(id!, 10);
  const navigate = useNavigate();
  const { toast } = useToast();

  // profile: for display-only sections (Workday, projects, holiday swaps, time off)
  const { profile, loading, loadProfile } = useMaintenanceTeamMemberProfile();
  // teamMember: for editable sections (has all tbl_team_members FK fields)
  const [teamMember, setTeamMember] = useState<TeamMemberDTO | null>(null);

  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loadingTimeOffs, setLoadingTimeOffs] = useState(false);

  const [holidaySwaps, setHolidaySwaps] = useState<HolidaySwapDTO[]>([]);
  const [loadingHolidaySwaps, setLoadingHolidaySwaps] = useState(false);

  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [roles, setRoles] = useState<PositionDTO[]>([]);
  const [tierBands, setTierBands] = useState<TierBandDTO[]>([]);
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [showAllTimeOffs, setShowAllTimeOffs] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showAllSwaps, setShowAllSwaps] = useState(false);
  const [showCancelledSwaps, setShowCancelledSwaps] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timeOffStartDate', desc: false }]);

  function loadTeamMember() {
    apiGet<TeamMemberDTO>(`/api/team-members/${teamMemberId}`).then(setTeamMember).catch(() => {});
  }

  function loadAdminTimeOffs() {
    setLoadingTimeOffs(true);
    apiGet<TimeOffWithDetailsDTO[]>(`/api/team-members/${teamMemberId}/admin-time-offs`)
      .then(setTimeOffs)
      .catch(() => toast({ title: 'Error', description: 'Failed to load time-offs', variant: 'destructive' }))
      .finally(() => setLoadingTimeOffs(false));
  }

  function loadAdminHolidaySwaps() {
    setLoadingHolidaySwaps(true);
    apiGet<HolidaySwapDTO[]>(`/api/team-members/${teamMemberId}/admin-holiday-swaps`)
      .then(setHolidaySwaps)
      .catch(() => toast({ title: 'Error', description: 'Failed to load holiday swaps', variant: 'destructive' }))
      .finally(() => setLoadingHolidaySwaps(false));
  }

  useEffect(() => {
    loadProfile(teamMemberId);
    loadTeamMember();
    loadAdminTimeOffs();
    loadAdminHolidaySwaps();
    apiGet<CountryDTO[]>('/api/countries').then(setCountries).catch(() => {});
    apiGet<PositionDTO[]>('/api/positions').then(setRoles).catch(() => {});
    apiGet<TierBandDTO[]>('/api/tier-bands').then(setTierBands).catch(() => {});
    getShifts().then(setShifts).catch(() => {});
  }, [teamMemberId]);

  const reload = () => {
    loadProfile(teamMemberId);
    loadTeamMember();
  };

  const filteredTimeOffs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timeOffs.filter((t) => {
      const isCancelled = t.statusName.toLowerCase().includes('cancelled');
      if (isCancelled && !showCancelled) return false;
      if (!showAllTimeOffs) {
        const end = parseUTCDateAsLocal(String(t.timeOffEndDate));
        end.setHours(0, 0, 0, 0);
        if (end < today) return false;
      }
      return true;
    });
  }, [timeOffs, showAllTimeOffs, showCancelled]);

  const timeOffColumns = useMemo<ColumnDef<TimeOffWithDetailsDTO>[]>(
    () => [
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        size: 150,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'timeOffStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        size: 70,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
        size: 130,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    [],
  );

  const timeOffTable = useReactTable({
    data: filteredTimeOffs,
    columns: timeOffColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredHolidaySwaps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidaySwaps.filter((s) => {
      const status = s.statusName.toLowerCase();
      const isCancelledOrRejected = status === 'cancelled' || status === 'rejected';
      if (isCancelledOrRejected && !showCancelledSwaps) return false;
      if (!showAllSwaps) {
        const replacement = parseUTCDateAsLocal(String(s.replacementDate));
        replacement.setHours(0, 0, 0, 0);
        if (replacement < today) return false;
      }
      return true;
    });
  }, [holidaySwaps, showAllSwaps, showCancelledSwaps]);

  const holidaySwapColumns = useMemo<ColumnDef<HolidaySwapDTO>[]>(
    () => [
      {
        accessorKey: 'holidayName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday" />,
        meta: { headerTitle: 'Holiday', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'originalDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday Date" />,
        cell: ({ row }) => formatUTCDate(row.original.originalDate),
        meta: { headerTitle: 'Holiday Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'replacementDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Replacement Date" />,
        cell: ({ row }) => formatUTCDate(row.original.replacementDate),
        meta: { headerTitle: 'Replacement Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>{row.original.statusName}</Badge>
        ),
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    [],
  );

  const holidaySwapTable = useReactTable({
    data: filteredHolidaySwaps,
    columns: holidaySwapColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
          <Skeleton className="h-64 md:col-span-2 lg:col-span-4" />
          <Skeleton className="h-64 md:col-span-2 lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (!profile || !teamMember) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Team Member Not Found</ToolbarPageTitle>
            <ToolbarDescription>This team member does not exist or is not active.</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={() => navigate('/maintenance/team-members')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team Members
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/maintenance/team-members')}
              variant="ghost"
              size="icon"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>
                {`${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`}
              </ToolbarPageTitle>
              <ToolbarDescription>
                {teamMember.teamMemberKnownAs && (
                  <span className="mr-2">"{teamMember.teamMemberKnownAs}"</span>
                )}
                {teamMember.workdayId && <span>WDID: {teamMember.workdayId}</span>}
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PersonalInfoSection teamMember={teamMember} onSaved={reload} />
        <WorkInfoSection
          teamMember={teamMember}
          roles={roles}
          tierBands={tierBands}
          shifts={shifts}
          onSaved={reload}
        />
        <LocationSection teamMember={teamMember} countries={countries} onSaved={reload} />
        <DatesSection teamMember={teamMember} onSaved={reload} />
        <IdentifiersSection teamMember={teamMember} onSaved={reload} />

        <ProjectsSection projects={profile.currentProjects} />

        {/* Workday Information */}
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4" />
              Workday Information
            </CardTitle>
            {!profile.workdayId ? (
              <p className="text-sm text-muted-foreground">No Workday ID linked to this team member</p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Hire Date</dt>
                  <dd className="text-sm mt-1">{profile.hireDate ? formatUTCDate(profile.hireDate) : '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Work Style</dt>
                  <dd className="text-sm mt-1">{profile.workStyle || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Gender</dt>
                  <dd className="text-sm mt-1">{profile.gender || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Birth Date</dt>
                  <dd className="text-sm mt-1">{profile.birthDate || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Parenthood</dt>
                  <dd className="text-sm mt-1">
                    {profile.parenthood === null ? '-' : profile.parenthood ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Billing Status</dt>
                  <dd className="text-sm mt-1">{profile.billingStatus || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Cost Center</dt>
                  <dd className="text-sm mt-1">{profile.costCenterNames || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Direct Manager (Workday)</dt>
                  <dd className="text-sm mt-1">{profile.directManager || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Corporate Email</dt>
                  <dd className="text-sm mt-1">{profile.corporateEmail || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Personal Email</dt>
                  <dd className="text-sm mt-1">{profile.personalEmail || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Cellphone</dt>
                  <dd className="text-sm mt-1">{profile.cellphone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Home Phone</dt>
                  <dd className="text-sm mt-1">{profile.homePhone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Vacation Days</dt>
                  <dd className="text-sm mt-1">
                    {profile.vacation != null ? `${profile.vacation} days` : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Personal Days</dt>
                  <dd className="text-sm mt-1">
                    {profile.personalDays != null ? `${profile.personalDays} days` : '-'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Holiday Swaps — read-only, matches the Time Off section below. This
            is the maintenance area: viewing/editing any team member's record,
            not acting as their supervisor, so there is no request/approve/
            reject action here (see /my-team for that flow) and no hierarchy
            check on the read (admin-holiday-swaps). */}
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="space-y-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarArrowDown className="h-4 w-4" />
              Holiday Swaps
            </CardTitle>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-all-swaps-maint"
                  checked={showAllSwaps}
                  onCheckedChange={(checked) => setShowAllSwaps(checked === true)}
                />
                <Label htmlFor="show-all-swaps-maint" className="text-sm font-medium leading-none">
                  Show past
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-cancelled-swaps-maint"
                  checked={showCancelledSwaps}
                  onCheckedChange={(checked) => setShowCancelledSwaps(checked === true)}
                />
                <Label htmlFor="show-cancelled-swaps-maint" className="text-sm font-medium leading-none">
                  Show cancelled
                </Label>
              </div>
            </div>
            {loadingHolidaySwaps ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataGridContainer>
                <DataGrid table={holidaySwapTable} recordCount={filteredHolidaySwaps.length}>
                  <DataGridTable />
                </DataGrid>
              </DataGridContainer>
            )}
          </CardContent>
        </Card>

        {/* Time Off — read-only */}
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="space-y-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Time Off
            </CardTitle>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-all-maint"
                  checked={showAllTimeOffs}
                  onCheckedChange={(checked) => setShowAllTimeOffs(checked === true)}
                />
                <Label htmlFor="show-all-maint" className="text-sm font-medium leading-none">
                  Show past
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-cancelled-maint"
                  checked={showCancelled}
                  onCheckedChange={(checked) => setShowCancelled(checked === true)}
                />
                <Label htmlFor="show-cancelled-maint" className="text-sm font-medium leading-none">
                  Show cancelled
                </Label>
              </div>
            </div>
            {loadingTimeOffs ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataGridContainer>
                <DataGrid
                  table={timeOffTable}
                  recordCount={filteredTimeOffs.length}
                  tableLayout={{ columnsResizable: true, headerBackground: true, headerBorder: true, rowBorder: true }}
                >
                  <DataGridTable />
                </DataGrid>
              </DataGridContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
