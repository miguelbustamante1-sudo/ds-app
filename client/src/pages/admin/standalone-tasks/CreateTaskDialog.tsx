import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { CreateStandaloneTaskDTO } from '@shared/dto';

interface TeamMemberOption {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

interface CreateTaskFormData {
  taskTitle: string;
  taskDescription: string;
  taskPriority: string;
  taskDueDate: string;
  teamMemberId: string;
  taskReferenceType: string;
  taskReferenceId: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PRIORITY_OPTIONS: ComboBoxOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [teamMemberOptions, setTeamMemberOptions] = useState<ComboBoxOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormData>({
    defaultValues: {
      taskTitle: '',
      taskDescription: '',
      taskPriority: 'MEDIUM',
      taskDueDate: '',
      teamMemberId: '',
      taskReferenceType: '',
      taskReferenceId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset();
    const loadMembers = async () => {
      try {
        const members = await apiGet<TeamMemberOption[]>('/api/team-members');
        setTeamMemberOptions(
          members.map((m) => ({
            value: String(m.teamMemberId),
            label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
          })),
        );
      } catch {
        toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' });
      }
    };
    void loadMembers();
  }, [open, reset, toast]);

  const watchedPriority = watch('taskPriority');
  const watchedTeamMemberId = watch('teamMemberId');

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      const payload: CreateStandaloneTaskDTO = {
        taskTitle: data.taskTitle.trim(),
        taskDescription: data.taskDescription.trim() || null,
        taskPriority: data.taskPriority as CreateStandaloneTaskDTO['taskPriority'],
        taskDueDate: data.taskDueDate || null,
        teamMemberId: parseInt(data.teamMemberId, 10),
        taskReferenceType: data.taskReferenceType.trim() || null,
        taskReferenceId: data.taskReferenceId.trim() || null,
      };
      await apiPost('/api/standalone-tasks', payload);
      toast({ title: 'Success', description: 'Task created successfully' });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="taskTitle">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="taskTitle"
              {...register('taskTitle', { required: 'Title is required' })}
              placeholder="Task title"
            />
            {errors.taskTitle && (
              <p className="text-sm text-destructive">{errors.taskTitle.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              {...register('taskDescription')}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>
              Assignee <span className="text-destructive">*</span>
            </Label>
            <ComboBox
              options={teamMemberOptions}
              value={watchedTeamMemberId}
              onValueChange={(value) => setValue('teamMemberId', value, { shouldValidate: true })}
              placeholder="Select assignee..."
            />
            <input
              type="hidden"
              {...register('teamMemberId', { required: 'Assignee is required' })}
            />
            {errors.teamMemberId && (
              <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Priority</Label>
            <ComboBox
              options={PRIORITY_OPTIONS}
              value={watchedPriority}
              onValueChange={(value) => setValue('taskPriority', value)}
              placeholder="Select priority..."
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="taskDueDate">Due Date</Label>
            <Input id="taskDueDate" type="date" {...register('taskDueDate')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="taskReferenceType">Reference Type</Label>
              <Input
                id="taskReferenceType"
                {...register('taskReferenceType')}
                placeholder="e.g. TIME_OFF"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskReferenceId">Reference ID</Label>
              <Input
                id="taskReferenceId"
                {...register('taskReferenceId')}
                placeholder="e.g. 1042"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
