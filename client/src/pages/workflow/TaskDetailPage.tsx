import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BackToHubButton } from '@/components/BackToHubButton';
import { apiGet } from '@/lib/api';
import { formatUTCDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { WitInstanceTask } from './types';

function taskStateBadge(state: string) {
  if (state === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (state === 'PENDING') return <Badge variant="secondary" appearance="light">Pending</Badge>;
  if (state === 'COMPLETED') return <Badge variant="success" appearance="light">Completed</Badge>;
  if (state === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  if (state === 'MISSED') return <Badge variant="warning" appearance="light">Missed</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

export function TaskDetailPage() {
  const { winId, witId } = useParams<{ winId: string; witId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [task, setTask] = useState<WitInstanceTask | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!winId || !witId) return;
    setLoading(true);
    apiGet<WitInstanceTask>(`/api/workflow/instances/${winId}/tasks/${witId}`)
      .then(setTask)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load task';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        navigate('/my-tasks');
      })
      .finally(() => setLoading(false));
  }, [winId, witId, navigate, toast]);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Task Detail</ToolbarPageTitle>
          <ToolbarDescription>
            {task ? `${task.code} — ${task.name}` : 'Loading...'}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/my-tasks')}>
            Back to Task Inbox
          </Button>
          <BackToHubButton hubPath="/tasks-hub" />
        </ToolbarActions>
      </Toolbar>

      {loading && !task ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : task ? (
        <div className="space-y-6 mt-6">
          <Card>
            <CardContent>
              <CardTitle className="mb-4">{task.code} — {task.name}</CardTitle>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">State</dt>
                  <dd>{taskStateBadge(task.state)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Attempt</dt>
                  <dd>{task.attemptNumber <= 1 ? 'Original' : `Replacement ${task.attemptNumber - 1}`}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due At</dt>
                  <dd>{task.dueAt ? formatUTCDateTime(task.dueAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Completed At</dt>
                  <dd>{task.completedAt ? formatUTCDateTime(task.completedAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Outcome</dt>
                  <dd>{task.outcomeCode ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Missed Resolved At</dt>
                  <dd>{task.missedResolvedAt ? formatUTCDateTime(task.missedResolvedAt) : '—'}</dd>
                </div>
              </dl>
              {task.description && (
                <div className="mt-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {task.description}
                </div>
              )}
              {task.resultComment && (
                <div className="mt-4">
                  <dt className="text-muted-foreground text-sm">Result Comment</dt>
                  <dd className="mt-1 text-sm">{task.resultComment}</dd>
                </div>
              )}
              {task.previousTaskId && winId && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/my-tasks/${winId}/${task.previousTaskId}`)}
                  >
                    View earlier attempt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
