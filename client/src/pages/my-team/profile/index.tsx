import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
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
import { ArrowLeft, User, Briefcase, MapPin, Calendar, Users, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMyTeamMembers, useTeamMemberTimeOffBreakdown } from '@/hooks/useSupervisorTimeOff';
import { formatDate } from '@/lib/helpers';

export function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { teamMembers, loading: loadingMembers, loadTeamMembers } = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const { breakdown, loading: loadingBreakdown, loadBreakdown } = useTeamMemberTimeOffBreakdown({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const loading = loadingMembers;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Load breakdown when team member ID is available
  useEffect(() => {
    if (id) {
      loadBreakdown(parseInt(id, 10));
    }
  }, [id]);

  const teamMember = useMemo<SupervisedTeamMemberDTO | undefined>(() => {
    if (!id) return undefined;
    return teamMembers.find((tm) => tm.teamMemberId === parseInt(id, 10));
  }, [teamMembers, id]);

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
        </div>
      </div>
    );
  }

  if (!teamMember) {
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
              <ToolbarPageTitle>{teamMember.teamMemberFullName}</ToolbarPageTitle>
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
                <dd className="text-sm mt-1">{teamMember.teamMemberFullName}</dd>
              </div>
              {teamMember.teamMemberKnownAs && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Known As</dt>
                  <dd className="text-sm mt-1">{teamMember.teamMemberKnownAs}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Workday ID</dt>
                <dd className="text-sm mt-1">{teamMember.workdayId || '-'}</dd>
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
                <dd className="text-sm mt-1">{teamMember.teamMemberSeniority || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Primary Role</dt>
                <dd className="text-sm mt-1">{teamMember.primaryRoleName || '-'}</dd>
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
                  {teamMember.countryName || '-'}
                  {teamMember.countryIso && (
                    <span className="text-xs text-muted-foreground">
                      ({teamMember.countryIso})
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
                  <Badge variant={teamMember.reportType === 'Direct' ? 'primary' : 'secondary'}>
                    {teamMember.reportType}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Assignment Start Date</dt>
                <dd className="text-sm mt-1 flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {formatDate(teamMember.supervisorAssignmentStartDate)}
                </dd>
              </div>
              {teamMember.supervisorAssignmentEndDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Assignment End Date</dt>
                  <dd className="text-sm mt-1 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatDate(teamMember.supervisorAssignmentEndDate)}
                  </dd>
                </div>
              )}
              {teamMember.teamMemberEndDate && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Team Member End Date</dt>
                  <dd className="text-sm mt-1 flex items-center gap-2 text-destructive">
                    <Calendar className="h-3 w-3" />
                    {formatDate(teamMember.teamMemberEndDate)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

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
