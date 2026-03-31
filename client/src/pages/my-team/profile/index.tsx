import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Briefcase, MapPin, Calendar, Users, CalendarDays, Building2, XCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useTeamMemberProfile } from '@/hooks/useTeamMemberProfile';
import { useTeamMemberTimeOffs, useSupervisorTimeOffOperations } from '@/hooks/useSupervisorTimeOff';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { HolidaySwapsSection } from './components/HolidaySwapsSection';
import { ProjectsSection } from '@/pages/my-profile/components/ProjectsSection';
import { CancelTimeOffDialog } from '@/pages/timeoff/supervisor/components/CancelTimeOffDialog';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';

function canCancelTimeOff(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return false;
  const required = Math.max(timeOff.categoryCountryDaysBefore ?? 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(String(timeOff.timeOffStartDate));
  startDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startDate.getTime() - today.getTime()) / 86_400_000);
  return diffDays > required;
}

function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const s = statusName.toLowerCase();
  if (s.includes('approved') || s.includes('acknowledged')) return 'success';
  if (s.includes('tentative') || s.includes('pending')) return 'secondary';
  if (s.includes('cancelled') || s.includes('rejected')) return 'destructive';
  return 'outline';
}

export function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { profile, loading, loadProfile } = useTeamMemberProfile({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { timeOffs, loading: loadingTimeOffs, loadTimeOffs } = useTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operations = useSupervisorTimeOffOperations({
    onSuccess: (msg) => toast({ title: 'Success', description: msg }),
    onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' }),
  });

  const [showAllTimeOffs, setShowAllTimeOffs] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timeOffStartDate', desc: false }]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState<TimeOffWithDetailsDTO | null>(null);

  const handleCancelConfirm = async (timeOffId: number, comment: string) => {
    await operations.cancelTimeOff(timeOffId, comment);
    if (id) loadTimeOffs(parseInt(id, 10));
  };

  const [approvedStatusId, setApprovedStatusId] = useState<number | null>(null);
  const [rejectedStatusId, setRejectedStatusId] = useState<number | null>(null);

  useEffect(() => {
    apiGet<Array<{ statusId: number; statusName: string }>>('/api/time-off-statuses')
      .then((statuses) => {
        const approved = statuses.find((s) => s.statusName.toLowerCase() === 'acknowledged');
        const rejected = statuses.find((s) => s.statusName.toLowerCase() === 'rejected');
        setApprovedStatusId(approved?.statusId ?? null);
        setRejectedStatusId(rejected?.statusId ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      const teamMemberId = parseInt(id, 10);
      loadProfile(teamMemberId);
      loadTimeOffs(teamMemberId);
    }
  }, [id]);

  const columns = useMemo<ColumnDef<TimeOffWithDetailsDTO>[]>(
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
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          if (!canCancelTimeOff(row.original)) return null;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTimeOff(row.original);
                setCancelDialogOpen(true);
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          );
        },
        size: 110,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    []
  );

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

  const table = useReactTable({
    data: filteredTimeOffs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleBack = () => {
    navigate('/my-team');
  };

  if (loading) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Team Member Not Found</ToolbarPageTitle>
            <ToolbarDescription>
              The team member you're looking for doesn't exist or you don't have access.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Team
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
            <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>
                {`${profile.teamMemberNames} ${profile.teamMemberSurnames}`}
              </ToolbarPageTitle>
              <ToolbarDescription>
                {profile.teamMemberKnownAs && (
                  <span className="mr-2">"{profile.teamMemberKnownAs}"</span>
                )}
                {profile.workdayId && <span>WDID: {profile.workdayId}</span>}
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                <dd className="text-sm mt-1">
                  {profile.teamMemberNames} {profile.teamMemberSurnames}
                </dd>
              </div>
              {profile.teamMemberKnownAs && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Known As</dt>
                  <dd className="text-sm mt-1">{profile.teamMemberKnownAs}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Workday ID</dt>
                <dd className="text-sm mt-1">{profile.workdayId || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Work Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Seniority</dt>
                <dd className="text-sm mt-1">{profile.teamMemberSeniority || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Primary Role</dt>
                <dd className="text-sm mt-1">{profile.primaryRoleName || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Current Projects */}
        <ProjectsSection projects={profile.currentProjects} />

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                <dd className="text-sm mt-1 flex items-center gap-2">
                  {profile.countryName || '-'}
                  {profile.countryIso && (
                    <span className="text-xs text-muted-foreground">
                      ({profile.countryIso})
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Supervision Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Supervision Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Report Type</dt>
                <dd className="text-sm mt-1">
                  <Badge variant={profile.reportType === 'Direct' ? 'primary' : 'secondary'}>
                    {profile.reportType}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Assignment Start Date</dt>
                <dd className="text-sm mt-1 flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {formatUTCDate(profile.supervisorAssignmentStartDate)}
                </dd>
              </div>
              {profile.supervisorAssignmentEndDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Assignment End Date</dt>
                  <dd className="text-sm mt-1 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatUTCDate(profile.supervisorAssignmentEndDate)}
                  </dd>
                </div>
              )}
              {profile.teamMemberEndDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Team Member End Date</dt>
                  <dd className="text-sm mt-1 flex items-center gap-2 text-destructive">
                    <Calendar className="h-3 w-3" />
                    {formatUTCDate(profile.teamMemberEndDate)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Workday Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Workday Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profile.workdayId ? (
              <p className="text-sm text-muted-foreground">No Workday ID linked to this team member</p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Hire Date</dt>
                  <dd className="text-sm mt-1">
                    {profile.hireDate ? formatUTCDate(profile.hireDate) : '-'}
                  </dd>
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

        {/* Holiday Swaps */}
        <HolidaySwapsSection
          teamMemberId={parseInt(id!, 10)}
          countryId={profile.countryId}
          approvedStatusId={approvedStatusId}
          rejectedStatusId={rejectedStatusId}
        />

        {/* Time Off */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Time Off
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-all-member"
                  checked={showAllTimeOffs}
                  onCheckedChange={(checked) => setShowAllTimeOffs(checked === true)}
                />
                <Label htmlFor="show-all-member" className="text-sm font-medium leading-none">
                  Show past
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-cancelled-member"
                  checked={showCancelled}
                  onCheckedChange={(checked) => setShowCancelled(checked === true)}
                />
                <Label htmlFor="show-cancelled-member" className="text-sm font-medium leading-none">
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
                  table={table}
                  recordCount={filteredTimeOffs.length}
                  tableLayout={{ headerBackground: true, headerBorder: true, rowBorder: true }}
                >
                  <DataGridTable />
                </DataGrid>
              </DataGridContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={selectedTimeOff}
        onConfirm={handleCancelConfirm}
        loading={operations.loading}
      />
    </div>
  );
}
