import { useEffect } from 'react';
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
import { apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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
];

const PRIORITY_OPTIONS: ComboBoxOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DYNAMIC_ASSIGNMENT_OPTIONS: ComboBoxOption[] = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'FIRST_SUPERVISOR', label: 'First Supervisor' },
];

export function TaskFormDrawer({ open, onOpenChange, wflId, task, onSuccess }: TaskFormDrawerProps) {
  const { toast } = useToast();
  const isEditing = !!task;

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
        assignedUserId: task?.assignedUserId ?? '',
        assignedRoleId: task?.assignedRoleId ?? '',
        dynamicAssignmentType: task?.dynamicAssignmentType ?? '',
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

  const onSubmit = async (data: TaskFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description.trim() || null,
      sequenceNo: data.sequenceNo ? parseInt(data.sequenceNo, 10) : null,
      taskType: 'MANUAL',
      assignmentType: data.assignmentType,
      assignedUserId: data.assignmentType === 'USER' ? (data.assignedUserId.trim() || null) : null,
      assignedRoleId: data.assignmentType === 'ROLE' ? (data.assignedRoleId.trim() || null) : null,
      dynamicAssignmentType: data.assignmentType === 'DYNAMIC' ? (data.dynamicAssignmentType || null) : null,
      priority: data.priority,
      slaDurationHours: data.slaDurationHours ? parseInt(data.slaDurationHours, 10) : null,
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

          {watchedAssignmentType === 'USER' && (
            <div className="space-y-1.5">
              <Label htmlFor="task-user">Assigned User ID</Label>
              <Input id="task-user" {...register('assignedUserId')} placeholder="User ID" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-sla">SLA Duration (hours)</Label>
              <Input id="task-sla" type="number" {...register('slaDurationHours')} placeholder="24" />
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
