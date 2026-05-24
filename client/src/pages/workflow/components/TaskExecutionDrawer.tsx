import { useEffect, useState } from 'react';
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
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { WitInstanceTask, WiiInstanceInput } from '../types';
import { ReassignTaskModal } from './ReassignTaskModal';

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
  const [task, setTask] = useState<WitInstanceTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

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
              checked={Boolean(watch(input.wiiId as keyof CompleteFormData))}
              onCheckedChange={(v) =>
                setValue(input.wiiId as keyof CompleteFormData, v)
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
        const currentVal = String(watch(input.wiiId as keyof CompleteFormData) ?? '');
        return (
          <div key={input.wiiId} className="space-y-1.5">
            {label}
            <ComboBox
              options={selectOptions}
              value={currentVal}
              onValueChange={(v) => setValue(input.wiiId as keyof CompleteFormData, v)}
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
    <>
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
                {task.dueAt && (
                  <p className="text-sm text-muted-foreground">
                    Due: {formatUTCDate(task.dueAt)}
                  </p>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {task.description}
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

              {/* Outcome */}
              {canComplete && (
                <div className="space-y-1.5">
                  <Label htmlFor="outcome-code">
                    Outcome Code <span className="text-destructive">*</span>
                  </Label>
                  {/* TODO: Replace with ComboBox once GET /api/workflow/templates/:wflId/tasks/:wtkId/outcomes endpoint is available */}
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

              <SheetFooter className="flex flex-wrap gap-2 pt-2">
                {canComplete && (
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
                {canComplete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReassignOpen(true)}
                  >
                    Reassign
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

      {task && witId && winId && (
        <ReassignTaskModal
          witId={witId}
          winId={winId}
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          requireReason={false}
          onSuccess={() => {
            onTaskUpdated();
            setReassignOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
