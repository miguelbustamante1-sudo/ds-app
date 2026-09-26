import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';
import type { WtkWorkflowTemplateTask } from '../types';

interface TaskFormData {
  code: string;
  name: string;
  description: string;
  sequenceNo: string;
  taskType: string;
  assignmentType: string;
  assignedUserId: string;
  assignedRoleId: string;
  dynamicAssignmentType: string;
  deadlineAction: string;
  reductionPercentage: string;
  replacementLimit: string;
  finalEscalationType: string;
  escalationUserId: string;
  escalationRoleId: string;
  escalationDynamicType: string;
  priority: string;
  slaDurationHours: string;
  maxRetryCount: string;
  allowReassignment: boolean;
  requireCommentOnReassign: boolean;
  allowFail: boolean;
  isStartingTask: boolean;
}

interface TaskFormDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wflId: string;
  task?: WtkWorkflowTemplateTask;
  onSuccess: () => void;
}

const ASSIGNMENT_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'USER', label: 'User' },
  { value: 'ROLE', label: 'Role' },
  { value: 'DYNAMIC', label: 'Dynamic' },
  { value: 'DYNAMIC_TD_HIERARCHY', label: 'Dynamic (Org Hierarchy)' },
  { value: 'CONTEXT', label: 'Context (caller-supplied)' },
];

const PRIORITY_OPTIONS: ComboBoxOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const ORG_HIERARCHY_POSITION_OPTIONS: ComboBoxOption[] = [
  { value: 'TEAM_LEADER', label: 'Team Leader' },
  { value: 'OM', label: 'Operations Manager' },
  { value: 'AGM', label: 'AGM' },
];

const DYNAMIC_ASSIGNMENT_OPTIONS: ComboBoxOption[] = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'FIRST_SUPERVISOR', label: 'First Supervisor' },
];

const DEADLINE_ACTION_OPTIONS: ComboBoxOption[] = [
  { value: 'ESCALATE', label: 'Escalate' },
  { value: 'MISSED_AND_RECREATE', label: 'Missed and Recreate' },
];

const FINAL_ESCALATION_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'USER', label: 'User' },
  { value: 'ROLE', label: 'Role' },
  { value: 'DYNAMIC', label: 'Dynamic' },
  { value: 'DYNAMIC_TD_HIERARCHY', label: 'Dynamic (Org Hierarchy)' },
];

export function TaskFormDrawer({ open, onOpenChange, wflId, task, onSuccess }: TaskFormDrawerProps) {
  const { toast } = useToast();
  const isEditing = !!task;
  const [userOptions, setUserOptions] = useState<ComboBoxOption[]>([]);

  useEffect(() => {
    if (!open) return;
    apiGet<ActingAsUserDTO[]>('/api/workflow/users')
      .then((users) => {
        setUserOptions(
          users.map((u) => ({
            value: u.userId.toString(),
            label: u.workdayId ? `${u.fullName} (${u.workdayId})` : u.fullName,
          })),
        );
      })
      .catch(() => {
        // silently ignore — the ComboBox will just show no options
      });
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      sequenceNo: '',
      taskType: 'MANUAL',
      assignmentType: '',
      assignedUserId: '',
      assignedRoleId: '',
      dynamicAssignmentType: '',
      deadlineAction: 'ESCALATE',
      reductionPercentage: '',
      replacementLimit: '',
      finalEscalationType: '',
      escalationUserId: '',
      escalationRoleId: '',
      escalationDynamicType: '',
      priority: 'MEDIUM',
      slaDurationHours: '',
      maxRetryCount: '3',
      allowReassignment: false,
      requireCommentOnReassign: false,
      allowFail: false,
      isStartingTask: false,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: task?.code ?? '',
        name: task?.name ?? '',
        description: task?.description ?? '',
        sequenceNo: task?.sequenceNo?.toString() ?? '',
        taskType: 'MANUAL',
        assignmentType: task?.assignmentType ?? '',
        assignedUserId: task?.assignedUserId?.toString() ?? '',
        assignedRoleId: task?.assignedRoleId ?? '',
        dynamicAssignmentType: task?.dynamicAssignmentType ?? '',
        deadlineAction: task?.deadlineAction ?? 'ESCALATE',
        reductionPercentage:
          task?.reductionPercentage != null ? (task.reductionPercentage * 100).toString() : '',
        replacementLimit: task?.replacementLimit?.toString() ?? '',
        finalEscalationType: task?.escalationUserId
          ? 'USER'
          : task?.escalationRoleId
            ? 'ROLE'
            : task?.escalationDynamicType && (task.escalationDynamicType === 'MANAGER' || task.escalationDynamicType === 'FIRST_SUPERVISOR')
              ? 'DYNAMIC'
              : task?.escalationDynamicType
                ? 'DYNAMIC_TD_HIERARCHY'
                : '',
        escalationUserId: task?.escalationUserId?.toString() ?? '',
        escalationRoleId: task?.escalationRoleId ?? '',
        escalationDynamicType: task?.escalationDynamicType ?? '',
        priority: task?.priority ?? 'MEDIUM',
        slaDurationHours: task?.slaDurationHours?.toString() ?? '',
        maxRetryCount: task?.maxRetryCount?.toString() ?? '3',
        allowReassignment: task?.allowReassignment ?? false,
        requireCommentOnReassign: task?.requireCommentOnReassign ?? false,
        allowFail: task?.allowFail ?? false,
        isStartingTask: task?.isStartingTask ?? false,
      });
    }
  }, [open, task, reset]);

  const watchedAssignmentType = watch('assignmentType');
  const watchedAllowReassignment = watch('allowReassignment');
  const watchedDeadlineAction = watch('deadlineAction');
  const watchedFinalEscalationType = watch('finalEscalationType');
  const watchedReductionPercentage = watch('reductionPercentage');
  const watchedReplacementLimit = watch('replacementLimit');

  const onSubmit = async (data: TaskFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description.trim() || null,
      sequenceNo: data.sequenceNo ? parseInt(data.sequenceNo, 10) : null,
      taskType: 'MANUAL',
      assignmentType: data.assignmentType,
      assignedUserId: data.assignmentType === 'USER' && data.assignedUserId.trim()
        ? parseInt(data.assignedUserId, 10)
        : null,
      assignedRoleId: data.assignmentType === 'ROLE' ? (data.assignedRoleId.trim() || null) : null,
      dynamicAssignmentType: data.assignmentType === 'DYNAMIC' || data.assignmentType === 'DYNAMIC_TD_HIERARCHY'
        ? (data.dynamicAssignmentType || null)
        : null,
      deadlineAction: data.deadlineAction,
      reductionPercentage:
        data.deadlineAction === 'MISSED_AND_RECREATE' && data.reductionPercentage
          ? parseFloat(data.reductionPercentage) / 100
          : null,
      replacementLimit:
        data.deadlineAction === 'MISSED_AND_RECREATE' && data.replacementLimit
          ? parseInt(data.replacementLimit, 10)
          : null,
      escalationUserId:
        data.finalEscalationType === 'USER' && data.escalationUserId.trim()
          ? parseInt(data.escalationUserId, 10)
          : null,
      escalationRoleId:
        data.finalEscalationType === 'ROLE' ? (data.escalationRoleId.trim() || null) : null,
      escalationDynamicType:
        data.finalEscalationType === 'DYNAMIC' || data.finalEscalationType === 'DYNAMIC_TD_HIERARCHY'
          ? (data.escalationDynamicType || null)
          : null,
      priority: data.priority,
      slaDurationHours: data.slaDurationHours ? parseFloat(data.slaDurationHours) : null,
      maxRetryCount: parseInt(data.maxRetryCount, 10) || 3,
      allowReassignment: data.allowReassignment,
      requireCommentOnReassign: data.requireCommentOnReassign,
      allowFail: data.allowFail,
      isStartingTask: data.isStartingTask,
    };

    try {
      if (isEditing) {
        await apiPatch<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks/${task.wtkId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Task updated.' });
      } else {
        await apiPost<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks`,
          payload,
        );
        toast({ title: 'Success', description: 'Task created.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} task`;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Task' : 'Add Task'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-code"
                {...register('code', { required: 'Code is required' })}
                placeholder="e.g. REVIEW"
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-sequence">Sequence No.</Label>
              <Input id="task-sequence" type="number" {...register('sequenceNo')} placeholder="1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-name"
              {...register('name', { required: 'Name is required' })}
              placeholder="Task name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" {...register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Assignment Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={ASSIGNMENT_TYPE_OPTIONS}
                value={watchedAssignmentType}
                onValueChange={(v) => setValue('assignmentType', v)}
                placeholder="Select type..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Priority <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={PRIORITY_OPTIONS}
                value={watch('priority')}
                onValueChange={(v) => setValue('priority', v)}
                placeholder="Select priority..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Deadline Action <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={DEADLINE_ACTION_OPTIONS}
                value={watchedDeadlineAction}
                onValueChange={(v) => setValue('deadlineAction', v)}
                placeholder="Select..."
              />
            </div>
          </div>

          {/* Final escalation target — not gated on deadlineAction. escalationUserId/RoleId/
              DynamicType have no UI today even for existing ESCALATE behavior; this fixes
              that pre-existing gap as a byproduct of the same field set Missed and Recreate
              needs for its own final-escalation step. */}
          <div className="space-y-1.5">
            <Label>Final Escalation Target</Label>
            <ComboBox
              options={FINAL_ESCALATION_TYPE_OPTIONS}
              value={watchedFinalEscalationType}
              onValueChange={(v) => setValue('finalEscalationType', v)}
              placeholder="Select..."
            />
          </div>

          {watchedFinalEscalationType === 'USER' && (
            <div className="space-y-1.5">
              <Label>Escalation User</Label>
              <ComboBox
                options={userOptions}
                value={watch('escalationUserId')}
                onValueChange={(v) => setValue('escalationUserId', v)}
                placeholder="Select user..."
                searchPlaceholder="Search users..."
                emptyMessage="No users found."
              />
            </div>
          )}

          {watchedFinalEscalationType === 'ROLE' && (
            <div className="space-y-1.5">
              <Label htmlFor="task-escalation-role">Escalation Role ID</Label>
              <Input id="task-escalation-role" {...register('escalationRoleId')} placeholder="Role ID" />
            </div>
          )}

          {watchedFinalEscalationType === 'DYNAMIC' && (
            <div className="space-y-1.5">
              <Label>Escalation Dynamic Type</Label>
              <ComboBox
                options={DYNAMIC_ASSIGNMENT_OPTIONS}
                value={watch('escalationDynamicType')}
                onValueChange={(v) => setValue('escalationDynamicType', v)}
                placeholder="Select..."
              />
            </div>
          )}

          {watchedFinalEscalationType === 'DYNAMIC_TD_HIERARCHY' && (
            <div className="space-y-1.5">
              <Label>Escalation Org Position</Label>
              <ComboBox
                options={ORG_HIERARCHY_POSITION_OPTIONS}
                value={watch('escalationDynamicType')}
                onValueChange={(v) => setValue('escalationDynamicType', v)}
                placeholder="Select..."
              />
            </div>
          )}

          {watchedDeadlineAction === 'MISSED_AND_RECREATE' && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-reduction">
                    Reduction % <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="task-reduction"
                    type="number"
                    min={1}
                    max={100}
                    {...register('reductionPercentage', {
                      required: watchedDeadlineAction === 'MISSED_AND_RECREATE' ? 'Reduction % is required' : false,
                      min: { value: 1, message: 'Must be greater than 0' },
                      max: { value: 100, message: 'Must be 100 or less' },
                    })}
                    placeholder="50"
                  />
                  {errors.reductionPercentage && (
                    <p className="text-sm text-destructive">{errors.reductionPercentage.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-replacement-limit">
                    Replacement Limit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="task-replacement-limit"
                    type="number"
                    min={0}
                    {...register('replacementLimit', {
                      required: watchedDeadlineAction === 'MISSED_AND_RECREATE' ? 'Replacement limit is required' : false,
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    placeholder="2"
                  />
                  {errors.replacementLimit && (
                    <p className="text-sm text-destructive">{errors.replacementLimit.message}</p>
                  )}
                </div>
              </div>
              {watch('slaDurationHours') && watchedReductionPercentage && watchedReplacementLimit && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const original = parseFloat(watch('slaDurationHours'));
                    const pct = parseFloat(watchedReductionPercentage) / 100;
                    const limit = parseInt(watchedReplacementLimit, 10);
                    if (!original || Number.isNaN(pct) || Number.isNaN(limit)) return null;
                    const durations: number[] = [];
                    let current = original;
                    for (let i = 0; i < limit; i++) {
                      current = Math.max(Math.ceil(current * (1 - pct)), 1);
                      durations.push(current);
                    }
                    return `Original: ${original}h. Up to ${limit} replacement${limit === 1 ? '' : 's'}: ${durations.join('h, ')}h. If the final replacement is missed, escalates to the configured target.`;
                  })()}
                </p>
              )}
            </div>
          )}

          {watchedAssignmentType === 'USER' && (
            <div className="space-y-1.5">
              <Label>Assigned User</Label>
              <ComboBox
                options={userOptions}
                value={watch('assignedUserId')}
                onValueChange={(v) => setValue('assignedUserId', v)}
                placeholder="Select user..."
                searchPlaceholder="Search users..."
                emptyMessage="No users found."
              />
            </div>
          )}

          {watchedAssignmentType === 'ROLE' && (
            <div className="space-y-1.5">
              <Label htmlFor="task-role">Assigned Role ID</Label>
              <Input id="task-role" {...register('assignedRoleId')} placeholder="Role ID" />
            </div>
          )}

          {watchedAssignmentType === 'DYNAMIC' && (
            <div className="space-y-1.5">
              <Label>Dynamic Assignment Type</Label>
              <ComboBox
                options={DYNAMIC_ASSIGNMENT_OPTIONS}
                value={watch('dynamicAssignmentType')}
                onValueChange={(v) => setValue('dynamicAssignmentType', v)}
                placeholder="Select..."
              />
            </div>
          )}

          {watchedAssignmentType === 'CONTEXT' && (
            <p className="text-xs text-muted-foreground">
              No resolution algorithm — the assignee is supplied directly by whatever starts the
              instance or completes the prior task. Required on every task of a DATABASE
              execution type template; not valid on a CODE execution type template.
            </p>
          )}

          {watchedAssignmentType === 'DYNAMIC_TD_HIERARCHY' && (
            <div className="space-y-1.5">
              <Label>Org Position</Label>
              <ComboBox
                options={ORG_HIERARCHY_POSITION_OPTIONS}
                value={watch('dynamicAssignmentType')}
                onValueChange={(v) => setValue('dynamicAssignmentType', v)}
                placeholder="Select..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-sla">SLA Duration (hours)</Label>
              <Input id="task-sla" type="number" step="0.25" {...register('slaDurationHours')} placeholder="24" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-retry">Max Retry Count</Label>
              <Input id="task-retry" type="number" {...register('maxRetryCount')} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <Switch
                id="task-starting"
                checked={watch('isStartingTask')}
                onCheckedChange={(v) => setValue('isStartingTask', v)}
              />
              <Label htmlFor="task-starting">Starting Task</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="task-allow-fail"
                checked={watch('allowFail')}
                onCheckedChange={(v) => setValue('allowFail', v)}
              />
              <Label htmlFor="task-allow-fail">Allow Fail</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="task-allow-reassign"
                checked={watchedAllowReassignment}
                onCheckedChange={(v) => setValue('allowReassignment', v)}
              />
              <Label htmlFor="task-allow-reassign">Allow Reassignment</Label>
            </div>

            {watchedAllowReassignment && (
              <div className="flex items-center gap-3 pl-6">
                <Switch
                  id="task-comment-reassign"
                  checked={watch('requireCommentOnReassign')}
                  onCheckedChange={(v) => setValue('requireCommentOnReassign', v)}
                />
                <Label htmlFor="task-comment-reassign">Require Comment on Reassign</Label>
              </div>
            )}
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
