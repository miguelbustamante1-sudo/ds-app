import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { createRecurringTaskTemplate } from '@/api/recurringTaskTemplates';
import type { CreateRecurringTaskTemplateDTO, RecurringTaskTemplateDTO, TemplatePriority } from '@shared/dto';
import type { TeamMemberDTO } from '@shared/dto';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

interface FormValues {
  templateTitle: string;
  templateDescription: string;
  templatePriority: string;
  intervalDays: number;
  useSupervisorHierarchy: boolean;
  teamMemberId: number | null;
  autoGenerateOnCreate: boolean;
}

interface CreateTemplateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: RecurringTaskTemplateDTO) => void;
}

export function CreateTemplateDrawer({ open, onOpenChange, onCreated }: CreateTemplateDrawerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        templateTitle: '',
        templateDescription: '',
        templatePriority: 'MEDIUM',
        intervalDays: 30,
        useSupervisorHierarchy: false,
        teamMemberId: null,
        autoGenerateOnCreate: true,
      },
    });

  const useHierarchy = watch('useSupervisorHierarchy');

  useEffect(() => {
    if (!open) { reset(); return; }
    void apiGet<TeamMemberDTO[]>('/api/team-members/active').then(setTeamMembers).catch(() => {});
  }, [open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!data.useSupervisorHierarchy && !data.teamMemberId) {
      toast({ title: 'Assignee is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: CreateRecurringTaskTemplateDTO = {
        templateTitle: data.templateTitle,
        templateDescription: data.templateDescription || null,
        templatePriority: data.templatePriority as TemplatePriority,
        intervalDays: Number(data.intervalDays),
        useSupervisorHierarchy: data.useSupervisorHierarchy,
        teamMemberId: data.useSupervisorHierarchy ? null : data.teamMemberId,
        autoGenerateOnCreate: data.autoGenerateOnCreate,
      };
      const created = await createRecurringTaskTemplate(payload);
      toast({ title: 'Template created' });
      onCreated(created);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  });

  const memberOptions = teamMembers.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Recurring Template</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input {...register('templateTitle', { required: 'Title is required' })} />
            {errors.templateTitle && (
              <p className="text-sm text-destructive">{errors.templateTitle.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea {...register('templateDescription')} rows={3} />
          </div>

          <div className="space-y-1">
            <Label>Priority</Label>
            <Controller
              name="templatePriority"
              control={control}
              render={({ field }) => (
                <ComboBox
                  options={PRIORITY_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select priority"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>Interval (days)</Label>
            <Input
              type="number"
              min={1}
              {...register('intervalDays', { valueAsNumber: true, min: 1 })}
            />
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="useSupervisorHierarchy"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>Use supervisor hierarchy (fan-out to direct reports)</Label>
          </div>

          {!useHierarchy && (
            <div className="space-y-1">
              <Label>Assignee *</Label>
              <Controller
                name="teamMemberId"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    options={memberOptions}
                    value={field.value !== null ? String(field.value) : ''}
                    onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    placeholder="Search team member..."
                  />
                )}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Controller
              name="autoGenerateOnCreate"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>Generate tasks immediately on save</Label>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Template'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
