import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Activity } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { useBenchMoveDetail } from '../hooks/useBenchMoveDetail';

export function BenchMoveDetailPage() {
  const { benchId: benchIdParam } = useParams<{ benchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { detail, loading, error, loadDetail } = useBenchMoveDetail();

  const benchId = benchIdParam ? parseInt(benchIdParam, 10) : null;

  useEffect(() => {
    if (benchId && !isNaN(benchId)) {
      loadDetail(benchId);
    }
  }, [benchId]);

  const handleBack = () => {
    const from = searchParams.get('from');
    navigate(from ?? '/bench-move');
  };

  // Loading state
  if (loading && !detail) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (error === 404) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Bench Record Not Found</ToolbarPageTitle>
            <ToolbarDescription>
              The bench move record you're looking for doesn't exist.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (error === 403) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Access Denied</ToolbarPageTitle>
            <ToolbarDescription>
              You don't have permission to view this bench move record.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Error</ToolbarPageTitle>
            <ToolbarDescription>
              Something went wrong loading this bench move record.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{`← Bench Move #${detail.benchId}`}</ToolbarPageTitle>
              <ToolbarDescription>{detail.teamMemberName}</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Bench Details */}
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4" />
              Bench Details
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Team Member</dt>
                <dd className="text-sm mt-1">{detail.teamMemberName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Supervisor</dt>
                <dd className="text-sm mt-1">{detail.supervisorName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                <dd className="text-sm mt-1">{formatUTCDate(detail.startDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                <dd className="text-sm mt-1">
                  {detail.endDate ? formatUTCDate(detail.endDate) : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4" />
              Status
            </CardTitle>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge variant={detail.isActive ? 'success' : 'secondary'}>
                    {detail.isActive ? 'Active' : 'Ended'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Functional Area</dt>
                <dd className="text-sm mt-1">{detail.functionalAreaName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Allocation</dt>
                <dd className="text-sm mt-1">
                  {Math.round(detail.allocation * 100)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created By</dt>
                <dd className="text-sm mt-1">{detail.createdBy ?? '—'}</dd>
              </div>
              {detail.createdAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                  <dd className="text-sm mt-1">{formatUTCDate(detail.createdAt)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
