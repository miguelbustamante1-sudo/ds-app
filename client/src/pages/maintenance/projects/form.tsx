import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ProjectDTO, CreateProjectDTO, UpdateProjectDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';

interface ProjectFormData {
  projectName: string;
  projectExternalId: string;
  projectSow: string;
  projectStartDate: string;
  projectEndDate: string;
  projectActive: boolean;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDTO;
  onSuccess: () => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    defaultValues: {
      projectName: '',
      projectExternalId: '',
      projectSow: '',
      projectStartDate: '',
      projectEndDate: '',
      projectActive: true,
    },
  });

  const projectActive = watch('projectActive');

  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          projectName: project.projectName || '',
          projectExternalId: project.projectExternalId || '',
          projectSow: project.projectSow || '',
          projectStartDate: project.projectStartDate
            ? project.projectStartDate.substring(0, 10)
            : '',
          projectEndDate: project.projectEndDate
            ? project.projectEndDate.substring(0, 10)
            : '',
          projectActive: project.projectActive ?? true,
        });
      } else {
        reset({
          projectName: '',
          projectExternalId: '',
          projectSow: '',
          projectStartDate: '',
          projectEndDate: '',
          projectActive: true,
        });
      }
    }
  }, [open, project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateProjectDTO = {
          projectName: data.projectName.trim() || null,
          projectExternalId: data.projectExternalId.trim() || null,
          projectSow: data.projectSow.trim() || null,
          projectStartDate: data.projectStartDate || null,
          projectEndDate: data.projectEndDate || null,
          projectActive: data.projectActive,
        };
        await apiPut<ProjectDTO, UpdateProjectDTO>(`/api/projects/${project.projectId}`, payload);
        toast({ title: 'Success', description: 'Project updated successfully' });
      } else {
        const payload: CreateProjectDTO = {
          projectName: data.projectName.trim() || null,
          projectExternalId: data.projectExternalId.trim() || null,
          projectSow: data.projectSow.trim() || null,
          projectStartDate: data.projectStartDate || null,
          projectEndDate: data.projectEndDate || null,
          projectActive: data.projectActive,
        };
        await apiPost<ProjectDTO, CreateProjectDTO>('/api/projects', payload);
        toast({ title: 'Success', description: 'Project created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} project`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project information below.'
              : 'Fill in the details to create a new project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="e.g., Website Redesign"
                {...register('projectName', {
                  minLength: {
                    value: 2,
                    message: 'Project name must be at least 2 characters',
                  },
                })}
              />
              {errors.projectName && (
                <p className="text-sm text-destructive">{errors.projectName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectExternalId">External ID</Label>
              <Input
                id="projectExternalId"
                placeholder="e.g., PRJ-001"
                {...register('projectExternalId')}
              />
              <p className="text-sm text-muted-foreground">Optional external reference identifier</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectSow">Statement of Work (SOW)</Label>
              <Input
                id="projectSow"
                placeholder="e.g., SOW-2024-001"
                {...register('projectSow')}
              />
              <p className="text-sm text-muted-foreground">Optional statement of work reference</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectStartDate">Start Date</Label>
                <Input
                  id="projectStartDate"
                  type="date"
                  {...register('projectStartDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectEndDate">End Date</Label>
                <Input
                  id="projectEndDate"
                  type="date"
                  {...register('projectEndDate')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="projectActive">Active</Label>
                <p className="text-sm text-muted-foreground">Whether this project is currently active</p>
              </div>
              <Switch
                id="projectActive"
                checked={projectActive}
                onCheckedChange={(checked) => setValue('projectActive', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
