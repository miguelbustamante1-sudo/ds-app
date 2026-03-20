import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, User, Briefcase, MapPin, Calendar, Users, CalendarDays, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTeamMemberProfile } from '@/hooks/useTeamMemberProfile';
import { useTeamMemberTimeOffBreakdown } from '@/hooks/useSupervisorTimeOff';
import { formatUTCDate } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { HolidaySwapsSection } from './components/HolidaySwapsSection';

export function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { profile, loading, loadProfile } = useTeamMemberProfile({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { breakdown, loading: loadingBreakdown, loadBreakdown } = useTeamMemberTimeOffBreakdown({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const currentYear = new Date().getFullYear();
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
      loadBreakdown(teamMemberId);
    }
  }, [id]);

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

        {/* Time Off Summary */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Time Off Summary ({currentYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBreakdown ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : breakdown ? (
              <div className="space-y-4">
                {/* Total summary */}
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-medium">Total Time Off</span>
                  <span className="text-2xl font-bold">{breakdown.totalDays} days</span>
                </div>

                {/* Breakdown by category */}
                {breakdown.breakdown.length > 0 ? (
                  <div className="space-y-3">
                    {breakdown.breakdown.map((category) => (
                      <div key={category.categoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{category.categoryName}</span>
                          <span className="font-medium">{category.totalDays} days</span>
                        </div>
                        <Progress
                          value={breakdown.totalDays > 0 ? (category.totalDays / breakdown.totalDays) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No time off recorded this year</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load time off data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
