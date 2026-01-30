import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UserDTO, CreateUserDTO, UpdateUserDTO, TeamMemberDTO } from '@shared/dto';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

interface UserFormData {
  userName: string;
  userEmail: string;
  userRole: string;
  userStartDate: string;
  userEndDate: string;
  teamMemberId: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDTO;
  onSuccess: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!user;
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    defaultValues: {
      userName: '',
      userEmail: '',
      userRole: '',
      userStartDate: '',
      userEndDate: '',
      teamMemberId: '',
    },
  });

  const teamMemberIdValue = watch('teamMemberId');

  useEffect(() => {
    const loadTeamMembers = async () => {
      setLoadingTeamMembers(true);
      try {
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        setTeamMembers(data);
      } catch (error) {
        console.error('Failed to load team members', error);
      } finally {
        setLoadingTeamMembers(false);
      }
    };

    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          userName: user.userName,
          userEmail: user.userEmail,
          userRole: user.userRole,
          userStartDate: user.userStartDate
            ? new Date(user.userStartDate).toISOString().split('T')[0]
            : '',
          userEndDate: user.userEndDate
            ? new Date(user.userEndDate).toISOString().split('T')[0]
            : '',
          teamMemberId: user.teamMemberId?.toString() || '',
        });
      } else {
        reset({
          userName: '',
          userEmail: '',
          userRole: '',
          userStartDate: '',
          userEndDate: '',
          teamMemberId: '',
        });
      }
    }
  }, [open, user, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateUserDTO = {
          userName: data.userName.trim(),
          userEmail: data.userEmail.trim(),
          userRole: data.userRole.trim(),
          userStartDate: data.userStartDate,
          userEndDate: data.userEndDate || null,
          teamMemberId: data.teamMemberId ? Number(data.teamMemberId) : null,
        };
        await apiPut<UserDTO, UpdateUserDTO>(`/api/users/${user.userId}`, payload);
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
      } else {
        const payload: CreateUserDTO = {
          userName: data.userName.trim(),
          userEmail: data.userEmail.trim(),
          userRole: data.userRole.trim(),
          userStartDate: data.userStartDate,
          userEndDate: data.userEndDate || null,
          teamMemberId: data.teamMemberId ? Number(data.teamMemberId) : null,
        };
        await apiPost<UserDTO, CreateUserDTO>('/api/users', payload);
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} user`,
        variant: 'destructive',
      });
    }
  };

  const getTeamMemberDisplayName = (tm: TeamMemberDTO) => {
    const fullName = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.teamMemberKnownAs ? `${fullName} (${tm.teamMemberKnownAs})` : fullName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'New User'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the user information below.'
              : 'Fill in the details to create a new user.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="userName"
                placeholder="e.g., John Doe"
                {...register('userName', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
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
                placeholder="e.g., john.doe@example.com"
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
                Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="userRole"
                placeholder="e.g., Admin, Manager, User"
                {...register('userRole', {
                  required: 'Role is required',
                })}
              />
              {errors.userRole && (
                <p className="text-sm text-destructive">{errors.userRole.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="userStartDate"
                type="date"
                {...register('userStartDate', {
                  required: 'Start date is required',
                })}
              />
              {errors.userStartDate && (
                <p className="text-sm text-destructive">{errors.userStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEndDate">End Date</Label>
              <Input
                id="userEndDate"
                type="date"
                {...register('userEndDate')}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty if the user is still active
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamMemberId">Team Member</Label>
              <Select
                value={teamMemberIdValue}
                onValueChange={(value) => setValue('teamMemberId', value)}
                disabled={loadingTeamMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTeamMembers ? 'Loading...' : 'Select a team member (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {teamMembers.map((tm) => (
                    <SelectItem key={tm.teamMemberId} value={tm.teamMemberId.toString()}>
                      {getTeamMemberDisplayName(tm)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Link this user to a team member for tracking purposes
              </p>
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
