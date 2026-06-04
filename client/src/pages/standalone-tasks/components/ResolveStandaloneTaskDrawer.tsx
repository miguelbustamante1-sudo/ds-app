import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { StandaloneTaskDTO, StandaloneTaskCommentDTO } from '@shared/dto';

interface ResolveStandaloneTaskDrawerProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

interface CommentFormData {
  comment: string;
}

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

export function ResolveStandaloneTaskDrawer({
  taskId,
  open,
  onOpenChange,
  onResolved,
}: ResolveStandaloneTaskDrawerProps) {
  const { toast } = useToast();

  const [task, setTask] = useState<StandaloneTaskDTO | null>(null);
  const [comments, setComments] = useState<StandaloneTaskCommentDTO[]>([]);
  const [loadingTask, setLoadingTask] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmit,
    reset: resetComment,
    formState: { errors: commentErrors },
  } = useForm<CommentFormData>({ defaultValues: { comment: '' } });

  const {
    register: registerResolve,
    watch: watchResolve,
    reset: resetResolve,
  } = useForm<CommentFormData>({ defaultValues: { comment: '' } });

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoadingTask(true);
    try {
      const [t, c] = await Promise.all([
        apiGet<StandaloneTaskDTO>(`/api/standalone-tasks/${taskId}`),
        apiGet<StandaloneTaskCommentDTO[]>(`/api/standalone-tasks/${taskId}/comments`),
      ]);
      setTask(t);
      setComments(c);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoadingTask(false);
    }
  }, [taskId, toast]);

  useEffect(() => {
    if (open && taskId) {
      void loadTask();
    } else {
      setTask(null);
      setComments([]);
      resetComment();
      resetResolve();
    }
  }, [open, taskId, loadTask, resetComment, resetResolve]);

  const handleAddComment = handleCommentSubmit(async (data) => {
    if (!taskId) return;
    setAddingComment(true);
    try {
      await apiPost(`/api/standalone-tasks/${taskId}/comments`, {
        commentText: data.comment.trim(),
      });
      resetComment();
      const updated = await apiGet<StandaloneTaskCommentDTO[]>(
        `/api/standalone-tasks/${taskId}/comments`,
      );
      setComments(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add comment';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setAddingComment(false);
    }
  });

  const resolveWatchedComment = watchResolve('comment');

  const handleResolve = async (status: 'APPROVED' | 'REJECTED') => {
    if (!taskId) return;
    const comment = resolveWatchedComment?.trim();
    if (status === 'REJECTED' && !comment) {
      toast({
        title: 'Comment required',
        description: 'Please enter a comment before rejecting.',
        variant: 'destructive',
      });
      return;
    }
    setResolving(true);
    try {
      await apiPatch(`/api/standalone-tasks/${taskId}/resolve`, {
        status,
        comment: comment || null,
      });
      toast({
        title: status === 'APPROVED' ? 'Task approved' : 'Task rejected',
      });
      onResolved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Resolve Task</SheetTitle>
        </SheetHeader>

        {loadingTask ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : task ? (
          <div className="mt-4 space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{task.taskTitle}</h3>
              {task.taskDescription && (
                <p className="text-sm text-muted-foreground">{task.taskDescription}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {priorityBadge(task.taskPriority)}
                {task.taskDueDate && (
                  <span
                    className={
                      task.isOverdue
                        ? 'text-sm text-destructive font-medium'
                        : 'text-sm text-muted-foreground'
                    }
                  >
                    Due: {formatUTCDate(task.taskDueDate)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Comments</Label>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.commentId} className="rounded-md border p-3 text-sm space-y-1">
                      <p>{c.commentText}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatUTCDate(c.createdDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="space-y-2 pt-1">
                <Textarea
                  {...registerComment('comment', { required: 'Comment text is required' })}
                  placeholder="Add a comment..."
                  rows={2}
                />
                {commentErrors.comment && (
                  <p className="text-sm text-destructive">{commentErrors.comment.message}</p>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={addingComment}
                >
                  {addingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </form>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium">Resolution</Label>
              <p className="text-xs text-muted-foreground">
                Comment is optional for Approve, required for Reject.
              </p>
              <Textarea
                {...registerResolve('comment')}
                placeholder="Resolution comment..."
                rows={3}
              />
            </div>

            <SheetFooter className="flex gap-2 justify-end">
              <Button
                variant="destructive"
                onClick={() => void handleResolve('REJECTED')}
                disabled={resolving}
              >
                {resolving ? 'Saving...' : 'Reject'}
              </Button>
              <Button
                variant="default"
                onClick={() => void handleResolve('APPROVED')}
                disabled={resolving}
              >
                {resolving ? 'Saving...' : 'Approve'}
              </Button>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
