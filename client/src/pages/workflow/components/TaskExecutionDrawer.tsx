import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { apiGet, apiPost } from '@/lib/api';
import { formatUTCDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { WitInstanceTask, WiiInstanceInput, ChangedFieldDiff } from '../types';

interface TaskExecutionDrawerProps {
  witId: string | null;
  winId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  isClaimedByMe: boolean;
}

interface CompleteFormData {
  outcomeCode: string;
  comment: string;
  [key: string]: string | number | boolean;
}

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

function stateBadge(state: string) {
  if (state === 'ACTIVE') return <Badge variant="success" appearance="light">Active</Badge>;
  if (state === 'PENDING') return <Badge variant="secondary" appearance="light">Pending</Badge>;
  if (state === 'COMPLETED') return <Badge variant="success" appearance="light">Completed</Badge>;
  if (state === 'FAILED') return <Badge variant="destructive" appearance="light">Failed</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

// Generic camelCase -> "Title Case" formatter for a changed field's name —
// this drawer has no per-domain label map, it just makes whatever key a
// procedure wrote (e.g. "teamMemberFullLegalName") readable.
function formatFieldLabel(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildDefaultValues(inputs: WiiInstanceInput[]): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};
  for (const input of inputs) {
    const lastValue = input.inputValues?.[input.inputValues.length - 1];
    if (lastValue) {
      if (input.dataType === 'BOOLEAN') {
        defaults[input.wiiId] = lastValue.valueBoolean ?? false;
      } else if (input.dataType === 'NUMBER') {
        defaults[input.wiiId] = lastValue.valueNumber ?? 0;
      } else if (input.dataType === 'DATE') {
        defaults[input.wiiId] = lastValue.valueDate ?? '';
      } else if (input.dataType === 'DATETIME') {
        defaults[input.wiiId] = lastValue.valueDatetime ?? '';
      } else {
        defaults[input.wiiId] = lastValue.valueText ?? '';
      }
    } else {
      defaults[input.wiiId] =
        input.dataType === 'BOOLEAN'
          ? false
          : input.dataType === 'NUMBER'
          ? 0
          : '';
    }
  }
  return defaults;
}

export function TaskExecutionDrawer({
  witId,
  winId,
  open,
  onOpenChange,
  onTaskUpdated,
  isClaimedByMe,
}: TaskExecutionDrawerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [task, setTask] = useState<WitInstanceTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CompleteFormData>({
    defaultValues: { outcomeCode: '', comment: '' },
  });

  useEffect(() => {
    if (!open || !witId || !winId) {
      setTask(null);
      return;
    }

    const load = async () => {
      setTaskLoading(true);
      try {
        const data = await apiGet<WitInstanceTask>(
          `/api/workflow/instances/${winId}/tasks/${witId}`,
        );
        setTask(data);

        const inputDefaults = buildDefaultValues(data.inputs ?? []);
        reset({
          outcomeCode: '',
          comment: '',
          ...inputDefaults,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load task';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } finally {
        setTaskLoading(false);
      }
    };

    load();
  }, [open, witId, winId, reset, toast]);

  const canComplete = task?.state === 'ACTIVE' && isClaimedByMe;
  const canRetry =
    task?.state === 'FAILED' &&
    typeof task.retryCount === 'number' &&
    typeof task.maxRetryCount === 'number' &&
    task.retryCount < task.maxRetryCount;

  const onSubmitComplete = async (data: CompleteFormData) => {
    if (!task || !witId || !winId) return;

    if (!data.outcomeCode.trim()) {
      toast({ title: 'Validation', description: 'Outcome code is required', variant: 'destructive' });
      return;
    }

    const inputs = (task.inputs ?? []).map((input) => ({
      wiiId: input.wiiId,
      value: data[input.wiiId],
    }));

    try {
      await apiPost<unknown, { outcomeCode: string; inputs: Array<{ wiiId: string; value: string | number | boolean }>; comment?: string }>(
        `/api/workflow/instances/${winId}/tasks/${witId}/complete`,
        {
          outcomeCode: data.outcomeCode.trim(),
          inputs,
          comment: data.comment.trim() || undefined,
        },
      );
      toast({ title: 'Success', description: 'Task completed.' });
      onTaskUpdated();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleRetry = async () => {
    if (!witId || !winId) return;
    try {
      await apiPost<unknown, Record<string, never>>(
        `/api/workflow/instances/${winId}/tasks/${witId}/retry`,
        {},
      );
      toast({ title: 'Success', description: 'Task retried.' });
      onTaskUpdated();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retry task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const renderInput = (input: WiiInstanceInput) => {
    const isReadOnly = !canComplete;
    const label = (
      <Label htmlFor={`input-${input.wiiId}`}>
        {input.label}
        {input.isRequired && <span className="text-destructive"> *</span>}
      </Label>
    );

    switch (input.dataType) {
      case 'TEXT':
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <Input
              id={`input-${input.wiiId}`}
              {...register(input.wiiId, { required: input.isRequired ? `${input.label} is required` : false })}
              readOnly={isReadOnly}
            />
          </div>
        );

      case 'NUMBER':
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <Input
              id={`input-${input.wiiId}`}
              type="number"
              {...register(input.wiiId, {
                required: input.isRequired ? `${input.label} is required` : false,
                valueAsNumber: true,
              })}
              readOnly={isReadOnly}
            />
          </div>
        );

      case 'BOOLEAN':
        return (
          <div key={input.wiiId} className="flex items-center gap-3">
            <Switch
              id={`input-${input.wiiId}`}
              checked={Boolean(watch(input.wiiId))}
              onCheckedChange={(v) =>
                setValue(input.wiiId, v)
              }
              disabled={isReadOnly}
            />
            {label}
          </div>
        );

      case 'DATE':
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <Input
              id={`input-${input.wiiId}`}
              type="date"
              {...register(input.wiiId, { required: input.isRequired ? `${input.label} is required` : false })}
              readOnly={isReadOnly}
            />
          </div>
        );

      case 'DATETIME':
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <Input
              id={`input-${input.wiiId}`}
              type="datetime-local"
              {...register(input.wiiId, { required: input.isRequired ? `${input.label} is required` : false })}
              readOnly={isReadOnly}
            />
          </div>
        );

      case 'SELECT': {
        let selectOptions: ComboBoxOption[] = [];
        try {
          const parsed = input.optionSetJson as Array<{ label: string; value: string }>;
          if (Array.isArray(parsed)) {
            selectOptions = parsed.map((o) => ({ label: o.label, value: o.value }));
          }
        } catch {
          // malformed optionSetJson — fall back to empty options
        }
        const currentVal = String(watch(input.wiiId) ?? '');
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <ComboBox
              options={selectOptions}
              value={currentVal}
              onValueChange={(v) => setValue(input.wiiId, v)}
              placeholder="Select..."
              disabled={isReadOnly}
            />
          </div>
        );
      }

      default:
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <Input
              id={`input-${input.wiiId}`}
              {...register(input.wiiId)}
              readOnly={isReadOnly}
            />
          </div>
        );
    }
  };

  const sortedInputs = [...(task?.inputs ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        {taskLoading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : task ? (
          <form onSubmit={handleSubmit(onSubmitComplete)} className="space-y-6 mt-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{task.code}</span>
                {priorityBadge(task.priority)}
                {stateBadge(task.state)}
              </div>
              <h2 className="text-lg font-semibold">{task.name}</h2>
              {task.entityUrl && task.entitySummary && (
                <p className="text-sm">
                  <Link
                    to={task.entityUrl}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {task.entitySummary}
                  </Link>
                </p>
              )}
              {task.dueAt && (
                <p className="text-sm text-muted-foreground">
                  Due: {formatUTCDateTime(task.dueAt)}
                </p>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                {task.description}
              </div>
            )}

            {/* Missed-and-Recreate lineage — only shown for a task that is itself a
                replacement (attemptNumber > 1) or one that could still produce one
                (remainingReplacements != null). Ordinary ESCALATE-mode tasks never
                set remainingReplacements, so this renders nothing for them. Links to
                the read-only TaskDetailPage rather than trying to re-open this
                drawer in place — a different winId/witId pair with the drawer's own
                action buttons hidden would need its own extra prop, whereas a
                dedicated view-only page keeps this drawer's contract unchanged. */}
            {(task.attemptNumber > 1 || task.remainingReplacements != null) && (
              <div className="rounded-md border px-4 py-3 text-sm space-y-1">
                <p>
                  This is{' '}
                  {task.attemptNumber <= 1 ? 'the original attempt' : `Replacement ${task.attemptNumber - 1}`}
                  {task.remainingReplacements != null && task.remainingReplacements >= 0 && (
                    <> of up to {task.attemptNumber - 1 + task.remainingReplacements}</>
                  )}
                  .
                </p>
                {task.previousTaskId && winId && (
                  <button
                    type="button"
                    className="text-primary underline text-xs"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/my-tasks/${winId}/${task.previousTaskId}`);
                    }}
                  >
                    View previous attempt
                  </button>
                )}
                {task.remainingReplacements === 0 && (
                  <p className="text-muted-foreground text-xs">
                    0 replacements remaining — missing this deadline will escalate.
                  </p>
                )}
              </div>
            )}

            {/* Changed fields — only rendered when the instantiate/outcome
                procedure that created this instance wrote a 'changedFields'
                context key (e.g. Team Member Change Auth). Unrecognized for
                any instance that didn't, which is the common case — nothing
                renders. */}
            {Array.isArray(task.context?.changedFields) && (task.context.changedFields as ChangedFieldDiff[]).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Changes Requested</h3>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Field</th>
                        <th className="text-left font-medium px-3 py-2">From</th>
                        <th className="text-left font-medium px-3 py-2">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(task.context.changedFields as ChangedFieldDiff[]).map((diff) => (
                        <tr key={diff.field} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{formatFieldLabel(diff.field)}</td>
                          <td className="px-3 py-2">{formatFieldValue(diff.oldValue)}</td>
                          <td className="px-3 py-2 font-medium">{formatFieldValue(diff.newValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unclaimed role task banner */}
            {task.state === 'ACTIVE' && !isClaimedByMe && !task.resolvedUserId && (
              <div className="rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-warning-foreground flex items-center justify-between gap-2">
                <span>Claim this task to begin working on it.</span>
              </div>
            )}

            {/* Pending notice */}
            {task.state === 'PENDING' && (
              <div className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground">
                This task is not yet active.
              </div>
            )}

            {/* Inputs */}
            {sortedInputs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Inputs</h3>
                {sortedInputs.map((input) => renderInput(input))}
              </div>
            )}

            {/* Outcome code — free-text fallback for tasks whose template defines no
                outcomes. Tasks that DO define outcomes render those as buttons in the
                footer, below the comment, so there is a single action row. */}
            {canComplete && (!task.outcomes || task.outcomes.length === 0) && (
              <div className="space-y-1.5">
                <Label htmlFor="outcome-code">
                  Outcome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="outcome-code"
                  {...register('outcomeCode')}
                  placeholder="e.g. APPROVED"
                />
              </div>
            )}

            {/* Comment */}
            {canComplete && (
              <div className="space-y-1.5">
                <Label htmlFor="task-comment">Comment (optional)</Label>
                <Textarea
                  id="task-comment"
                  {...register('comment')}
                  rows={3}
                  placeholder="Add a comment..."
                />
              </div>
            )}

            {/* The task's own outcomes are the drawer's action buttons — one row, below the
                comment so it is read before an action is taken. Reassignment is deliberately
                absent: it is an admin action, available on the admin Instance Detail page. */}
            <SheetFooter className="flex flex-wrap gap-2 pt-2">
              {canComplete &&
                task.outcomes &&
                task.outcomes.length > 0 &&
                task.outcomes.map((outcome) => (
                  <Button
                    key={outcome.wtoId}
                    type="button"
                    variant={outcome.isTerminal ? 'primary' : 'destructive'}
                    disabled={isSubmitting}
                    onClick={() => {
                      setValue('outcomeCode', outcome.code);
                      handleSubmit(onSubmitComplete)();
                    }}
                  >
                    {outcome.label}
                  </Button>
                ))}
              {canComplete && (!task.outcomes || task.outcomes.length === 0) && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Completing...' : 'Complete'}
                </Button>
              )}
              {canRetry && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
