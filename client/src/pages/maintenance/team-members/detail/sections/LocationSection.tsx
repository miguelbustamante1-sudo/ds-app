import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { MapPin, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import type { TeamMemberDTO, UpdateTeamMemberDTO, CountryDTO } from '@shared/dto';

interface FormValues {
  countryId: string;
}

interface Props {
  teamMember: TeamMemberDTO;
  countries: CountryDTO[];
  onSaved: () => void;
}

export function LocationSection({ teamMember, countries, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormValues>();

  const watchedCountryId = watch('countryId');

  const countryOptions: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  useEffect(() => {
    if (!editing) {
      reset({ countryId: teamMember.countryId?.toString() ?? '' });
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
        { countryId: values.countryId ? Number(values.countryId) : null },
      );
      toast({ title: 'Success', description: 'Location updated' });
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }

  const countryLabel = teamMember.countryName ?? '-';

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
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
              <Label>Country</Label>
              <ComboBox
                options={countryOptions}
                value={watchedCountryId}
                onValueChange={(value) => setValue('countryId', value)}
                placeholder="Select a country..."
                searchPlaceholder="Search countries..."
                emptyMessage="No countries found."
              />
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
              <dt className="text-sm font-medium text-muted-foreground">Country</dt>
              <dd className="text-sm mt-1">{countryLabel}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
