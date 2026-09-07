import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UserDTO, UpdateUserDTO, TeamMemberDTO } from '@shared/dto';
import { apiGet, apiPut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { User } from 'lucide-react';

interface SectionAFormData {
  userName: string;
  userEmail: string;
  userRole: string;
  userStartDate: string;
  userEndDate: string;
  teamMemberId: string;
}

interface Props {
  user: UserDTO;
  onSaved: (updated: UserDTO) => void;
}

export function SectionA({ user, onSaved }: Props) {
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SectionAFormData>({
    defaultValues: {
      userName: user.userName,
      userEmail: user.userEmail,
      userRole: user.userRole,
      userStartDate: user.userStartDate
        ? new Date(user.userStartDate).toISOString().split('T')[0]
        : '',
      userEndDate: user.userEndDate
        ? new Date(user.userEndDate).toISOString().split('T')[0]
        : '',
      teamMemberId: user.teamMemberId?.toString() ?? '',
    },
  });

  const teamMemberIdValue = watch('teamMemberId');

  useEffect(() => {
    const load = async () => {
      setLoadingTeamMembers(true);
      try {
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        setTeamMembers(data);
      } catch {
        toast({
          title: 'Warning',
          description: 'Failed to load team members',
          variant: 'destructive',
        });
      } finally {
        setLoadingTeamMembers(false);
      }
    };
    load();
  }, [toast]);

  const onSubmit = async (data: SectionAFormData) => {
    try {
      const payload: UpdateUserDTO = {
        userName: data.userName.trim(),
        userEmail: data.userEmail.trim(),
        userRole: data.userRole.trim(),
        userStartDate: data.userStartDate,
        userEndDate: data.userEndDate || null,
        teamMemberId: data.teamMemberId ? Number(data.teamMemberId) : null,
      };
      const updated = await apiPut<UserDTO, UpdateUserDTO>(
        `/api/users/${user.userId}`,
        payload
      );
      toast({ title: 'Success', description: 'User updated successfully' });
      onSaved(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((tm) => ({
    value: tm.teamMemberId.toString(),
    label: `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="flex items-center gap-2 mb-6">
          <User className="h-4 w-4" />
          DS User Record
        </CardTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="userName"
              {...register('userName', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
              })}
            />
            {errors.userName && (
              <p className="text-sm text-destructive">{errors.userName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="userEmail"
              type="email"
              {...register('userEmail', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email format',
                },
              })}
            />
            {errors.userEmail && (
              <p className="text-sm text-destructive">{errors.userEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userRole">
              Application Role <span className="text-destructive">*</span>
            </Label>
            <Input
              id="userRole"
              placeholder="e.g., Admin, Manager, User"
              {...register('userRole', { required: 'Role is required' })}
            />
            {errors.userRole && (
              <p className="text-sm text-destructive">{errors.userRole.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="userStartDate"
                type="date"
                {...register('userStartDate', { required: 'Start date is required' })}
              />
              {errors.userStartDate && (
                <p className="text-sm text-destructive">{errors.userStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEndDate">End Date</Label>
              <Input id="userEndDate" type="date" {...register('userEndDate')} />
              <p className="text-sm text-muted-foreground">Leave empty if still active</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Team Member</Label>
            <ComboBox
              options={teamMemberOptions}
              value={teamMemberIdValue}
              onValueChange={(value) => setValue('teamMemberId', value)}
              placeholder={loadingTeamMembers ? 'Loading...' : 'Select a team member (optional)'}
              searchPlaceholder="Search team members..."
              emptyMessage="No team members found."
              disabled={loadingTeamMembers}
            />
            <p className="text-sm text-muted-foreground">
              Link this user to a team member for tracking purposes
            </p>
          </div>

          {canCreate('Users') && (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
