import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import type { TeamMemberDTO, UpdateTeamMemberDTO } from '@shared/dto';

interface FormValues {
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string;
  teamMemberFullLegalName: string;
}

interface Props {
  teamMember: TeamMemberDTO;
  onSaved: () => void;
}

export function PersonalInfoSection({ teamMember, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (!editing) {
      reset({
        teamMemberNames: teamMember.teamMemberNames,
        teamMemberSurnames: teamMember.teamMemberSurnames,
        teamMemberKnownAs: teamMember.teamMemberKnownAs ?? '',
        teamMemberFullLegalName: teamMember.teamMemberFullLegalName ?? '',
      });
    }
  }, [teamMember, editing, reset]);

  function handleCancel() {
    reset();
    setEditing(false);
  }

  async function onSubmit(values: FormValues) {
    try {
      await apiPut<TeamMemberDTO, UpdateTeamMemberDTO>(
        `/api/team-members/${teamMember.teamMemberId}`,
        {
          teamMemberNames: values.teamMemberNames.trim(),
          teamMemberSurnames: values.teamMemberSurnames.trim(),
          teamMemberKnownAs: values.teamMemberKnownAs.trim() || null,
          teamMemberFullLegalName: values.teamMemberFullLegalName.trim() || null,
        },
      );
      toast({ title: 'Success', description: 'Personal information updated' });
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pi-names">Names <span className="text-destructive">*</span></Label>
              <Input
                id="pi-names"
                {...register('teamMemberNames', {
                  required: 'Names are required',
                  minLength: { value: 2, message: 'Names must be at least 2 characters' },
                })}
              />
              {errors.teamMemberNames && (
                <p className="text-sm text-destructive">{errors.teamMemberNames.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pi-surnames">Surnames <span className="text-destructive">*</span></Label>
              <Input
                id="pi-surnames"
                {...register('teamMemberSurnames', {
                  required: 'Surnames are required',
                  minLength: { value: 2, message: 'Surnames must be at least 2 characters' },
                })}
              />
              {errors.teamMemberSurnames && (
                <p className="text-sm text-destructive">{errors.teamMemberSurnames.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pi-knownAs">Known As</Label>
              <Input id="pi-knownAs" {...register('teamMemberKnownAs')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pi-fullLegal">Full Legal Name</Label>
              <Input id="pi-fullLegal" {...register('teamMemberFullLegalName')} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
              <dd className="text-sm mt-1">{teamMember.teamMemberNames} {teamMember.teamMemberSurnames}</dd>
            </div>
            {teamMember.teamMemberKnownAs && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Known As</dt>
                <dd className="text-sm mt-1">{teamMember.teamMemberKnownAs}</dd>
              </div>
            )}
            {teamMember.teamMemberFullLegalName && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Full Legal Name</dt>
                <dd className="text-sm mt-1">{teamMember.teamMemberFullLegalName}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
