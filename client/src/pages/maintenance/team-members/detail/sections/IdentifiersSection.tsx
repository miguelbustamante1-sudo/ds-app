import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import type { TeamMemberDTO, UpdateTeamMemberDTO } from '@shared/dto';

interface FormValues {
  workdayId: string;
  teamMemberXid: string;
}

interface Props {
  teamMember: TeamMemberDTO;
  onSaved: () => void;
}

export function IdentifiersSection({ teamMember, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (!editing) {
      reset({
        workdayId: teamMember.workdayId ?? '',
        teamMemberXid: teamMember.teamMemberXid ?? '',
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
          workdayId: values.workdayId.trim() || null,
          teamMemberXid: values.teamMemberXid.trim() || null,
        },
      );
      toast({ title: 'Success', description: 'Identifiers updated' });
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
            <Hash className="h-4 w-4" />
            Identifiers
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
              <Label htmlFor="id-workday">Workday ID</Label>
              <Input id="id-workday" {...register('workdayId')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="id-xid">XID</Label>
              <Input id="id-xid" {...register('teamMemberXid')} />
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
              <dt className="text-sm font-medium text-muted-foreground">Workday ID</dt>
              <dd className="text-sm mt-1">{teamMember.workdayId || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">XID</dt>
              <dd className="text-sm mt-1">{teamMember.teamMemberXid || '-'}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
