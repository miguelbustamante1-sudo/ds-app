import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { ProjectDTO, ProjectGrantDTO, CreateProjectGrantDTO, TeamMemberDTO } from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api';

interface GrantFormData {
  teamMemberId: string;
  access: string;
}

interface ProjectGrantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDTO;
}

const ACCESS_OPTIONS: ComboBoxOption[] = [
  { value: 'owner', label: 'Owner (can modify)' },
  { value: 'view', label: 'View only' },
];

export function ProjectGrantsDialog({ open, onOpenChange, project }: ProjectGrantsDialogProps) {
  const { toast } = useToast();
  const [grants, setGrants] = useState<ProjectGrantDTO[]>([]);
  const [members, setMembers] = useState<TeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<GrantFormData>({
    defaultValues: { teamMemberId: '', access: 'owner' },
  });

  const loadGrants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ProjectGrantDTO[]>(`/api/project-grants?projectId=${project.projectId}`);
      setGrants(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load project grants';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [project.projectId, toast]);

  useEffect(() => {
    if (!open) return;
    loadGrants();
    apiGet<TeamMemberDTO[]>('/api/team-members').then(setMembers).catch(() => {});
    reset({ teamMemberId: '', access: 'owner' });
  }, [open, loadGrants, reset]);

  const memberOptions: ComboBoxOption[] = members.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  const onSubmit = async (data: GrantFormData) => {
    try {
      const payload: CreateProjectGrantDTO = {
        projectId: project.projectId,
        teamMemberId: Number(data.teamMemberId),
        access: data.access as 'owner' | 'view',
      };
      await apiPost('/api/project-grants', payload);
      toast({ title: 'Success', description: 'Access granted.' });
      reset({ teamMemberId: '', access: 'owner' });
      loadGrants();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to grant access';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleRemove = async (grant: ProjectGrantDTO) => {
    try {
      await apiDelete(`/api/project-grants/${grant.projectGrantId}`);
      toast({ title: 'Success', description: 'Access removed.' });
      loadGrants();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove access';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Access — {project.projectName}</DialogTitle>
          <DialogDescription>
            Assign this project to an Operations Manager (owner, can modify) or grant view-only access (FR-012/FR-013).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grants yet — only the project's PM can modify it.</p>
          ) : (
            <ul className="space-y-2">
              {grants.map((g) => (
                <li key={g.projectGrantId} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{g.teamMemberName}</span>
                    <Badge variant={g.access === 'owner' ? 'primary' : 'secondary'}>
                      {g.access === 'owner' ? 'Owner' : 'View'}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(g)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3 items-end border-t pt-4">
            <div className="space-y-2">
              <Controller
                name="teamMemberId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <ComboBox
                    options={memberOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a team member..."
                    searchPlaceholder="Search..."
                    emptyMessage="No team members found."
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Controller
                name="access"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    options={ACCESS_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select access..."
                    searchPlaceholder="Search..."
                    emptyMessage="No options."
                  />
                )}
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
