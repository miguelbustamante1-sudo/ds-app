import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AvailableForProjectDTO } from '@shared/dto/TeamMemberReport';
import type { FunctionalAreaDTO } from '@shared/dto';
import type { ShiftDTO } from '@shared/dto/Shift';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/api';
import { getShifts } from '@/services/shift';
import { ApiError } from '@/lib/api';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { getShifts, type ShiftDTO } from '@/services/shift';
import { MemberComboBox } from './components/MemberComboBox';
import { ContactComboBox } from './components/ContactComboBox';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  clientId: number | null;
  projectName: string | null;
  onSuccess: () => void;
}

interface FormData {
  teamMemberId: string;
  projectAssignmentStartDate: string;
  projectAssignmentEndDate: string;
  projectAssignmentBillRate: string;
  projectAssignmentBillRateCurrency: string;
  intercompanyBillRate: string;
  projectAssignmentAllocation: string;
  functionalAreaId: string;
  clientContactId: string;
  shiftId: string;
}

export function AddMemberDialog({ open, onOpenChange, projectId, clientId, projectName, onSuccess }: Props) {
  const { toast } = useToast();
  const [selectedTm, setSelectedTm] = useState<AvailableForProjectDTO | null>(null);
  const [teamMemberId, setTeamMemberId] = useState('');
  const [allFunctionalAreas, setAllFunctionalAreas] = useState<FunctionalAreaDTO[]>([]);
  const [functionalAreaId, setFunctionalAreaId] = useState('');
  const [contactId, setContactId] = useState('');
  const [allShifts, setAllShifts] = useState<ShiftDTO[]>([]);
  const [shiftId, setShiftId] = useState('');

  useEffect(() => {
    if (open) {
      apiGet<FunctionalAreaDTO[]>('/api/functional-areas')
        .then(setAllFunctionalAreas)
        .catch(() => toast({ title: 'Error', description: 'Failed to load functional areas', variant: 'destructive' }));
      getShifts()
        .then(setAllShifts)
        .catch(() => toast({ title: 'Error', description: 'Failed to load shifts', variant: 'destructive' }));
    }
  }, [open, toast]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      teamMemberId: '',
      projectAssignmentStartDate: '',
      projectAssignmentEndDate: '',
      projectAssignmentBillRate: '',
      projectAssignmentBillRateCurrency: '',
      intercompanyBillRate: '',
      projectAssignmentAllocation: '',
      functionalAreaId: '',
      clientContactId: '',
      shiftId: '',
    },
  });

  const functionalAreas = allFunctionalAreas;

  const handleTmSelect = (tm: AvailableForProjectDTO) => {
    setSelectedTm(tm);
    setValue('projectAssignmentBillRateCurrency', tm.countryCurrencySymbol ?? '');
    setValue('functionalAreaId', '');
    setFunctionalAreaId('');
  };

  const handleValueChange = (val: string) => {
    setTeamMemberId(val);
    setValue('teamMemberId', val);
    if (!val) {
      setSelectedTm(null);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      reset();
      setTeamMemberId('');
      setSelectedTm(null);
      setFunctionalAreaId('');
      setContactId('');
      setShiftId('');
    }
    onOpenChange(v);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await apiPost('/api/team-member-projects', {
        teamMemberId: Number(data.teamMemberId),
        projectId,
        projectAssignmentStartDate: data.projectAssignmentStartDate,
        projectAssignmentEndDate: data.projectAssignmentEndDate || null,
        projectAssignmentBillRate: Number(data.projectAssignmentBillRate),
        projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency.toUpperCase(),
        intercompanyBillRate: data.intercompanyBillRate ? Number(data.intercompanyBillRate) : null,
        projectAssignmentAllocation: Number(data.projectAssignmentAllocation),
        functionalAreaId: Number(data.functionalAreaId),
        clientContactId: data.clientContactId ? Number(data.clientContactId) : null,
        shiftId: data.shiftId ? Number(data.shiftId) : null,
      });
      toast({ title: 'Success', description: 'Team member added to project.' });
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '';
      if (msg.toLowerCase().includes('active assignment')) {
        toast({ title: 'Error', description: 'This team member already has an active assignment to this project.', variant: 'destructive' });
      } else if (msg.toLowerCase().includes('allocation')) {
        toast({ title: 'Error', description: "Allocation exceeds the team member's available capacity.", variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to add team member. Please try again.', variant: 'destructive' });
      }
    }
  };

  const availableAllocation = selectedTm?.availableAllocation ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member to Project</DialogTitle>
          {projectName && (
            <p className="text-sm text-muted-foreground">{projectName}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Team Member <span className="text-destructive">*</span>
              </Label>
              <MemberComboBox
                projectId={projectId}
                value={teamMemberId}
                onValueChange={handleValueChange}
                onSelectFull={handleTmSelect}
              />
              <input
                type="hidden"
                {...register('teamMemberId', { required: 'Team member is required' })}
              />
              {errors.teamMemberId && (
                <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>
              )}
            </div>

            {selectedTm !== null && (
              <div>
                <Badge variant="outline">
                  {availableAllocation}% available
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentStartDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentStartDate"
                type="date"
                {...register('projectAssignmentStartDate', {
                  required: 'Start date is required',
                  validate: (val) => {
                    if (!val) return true;
                    const [year, month, day] = val.split('-').map(Number);
                    const dow = new Date(year, month - 1, day).getDay();
                    return (dow !== 0 && dow !== 6) || 'Start date cannot be a weekend';
                  },
                })}
              />
              {errors.projectAssignmentStartDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentStartDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentEndDate">End Date</Label>
              <Input
                id="projectAssignmentEndDate"
                type="date"
                {...register('projectAssignmentEndDate', {
                  validate: (val, formValues) => {
                    if (!val) return true;
                    return parseUTCDateAsLocal(val) > parseUTCDateAsLocal(formValues.projectAssignmentStartDate) || 'End date must be after start date';
                  },
                })}
              />
              {errors.projectAssignmentEndDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentEndDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRate">
                Hourly Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRate"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 50.00"
                {...register('projectAssignmentBillRate', {
                  required: 'Hourly rate is required',
                  min: { value: 0.01, message: 'Rate must be greater than 0' },
                })}
              />
              {errors.projectAssignmentBillRate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentBillRateCurrency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRateCurrency"
                type="text"
                maxLength={3}
                placeholder="USD"
                {...register('projectAssignmentBillRateCurrency', {
                  required: 'Currency is required',
                  maxLength: { value: 3, message: 'Currency must be at most 3 characters' },
                })}
              />
              {errors.projectAssignmentBillRateCurrency && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRateCurrency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="intercompanyBillRate">Intercompany Bill Rate</Label>
              <Input
                id="intercompanyBillRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 45.00"
                {...register('intercompanyBillRate', {
                  min: { value: 0, message: 'Rate must be 0 or greater' },
                })}
              />
              {errors.intercompanyBillRate && (
                <p className="text-sm text-destructive">{errors.intercompanyBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Functional Area <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={functionalAreas.map((fa): ComboBoxOption => ({ value: String(fa.Id), label: fa.Name }))}
                value={functionalAreaId}
                onValueChange={(val) => {
                  setFunctionalAreaId(val);
                  setValue('functionalAreaId', val, { shouldValidate: true });
                }}
                placeholder="Select functional area..."
                searchPlaceholder="Search functional areas..."
                emptyMessage="No functional areas found."
                disabled={!selectedTm}
              />
              <input type="hidden" {...register('functionalAreaId', { required: 'Functional area is required' })} />
              {errors.functionalAreaId && (
                <p className="text-sm text-destructive">{errors.functionalAreaId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Shift <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={allShifts.map((s): ComboBoxOption => ({ value: String(s.shiftId), label: s.description }))}
                value={shiftId}
                onValueChange={(val) => {
                  setShiftId(val);
                  setValue('shiftId', val, { shouldValidate: true });
                }}
                placeholder="Select shift..."
                searchPlaceholder="Search shifts..."
                emptyMessage="No shifts found."
              />
              <input type="hidden" {...register('shiftId', { required: 'Shift is required' })} />
              {errors.shiftId && (
                <p className="text-sm text-destructive">{errors.shiftId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Contact</Label>
              <ContactComboBox
                clientId={clientId}
                value={contactId}
                onValueChange={(val) => {
                  setContactId(val);
                  setValue('clientContactId', val);
                }}
                disabled={!clientId}
              />
              <input type="hidden" {...register('clientContactId')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectAssignmentAllocation">
                Allocation % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentAllocation"
                type="number"
                step="0.01"
                min="0.01"
                max={availableAllocation ?? 100}
                placeholder="e.g., 100"
                {...register('projectAssignmentAllocation', {
                  required: 'Allocation is required',
                  min: { value: 0.01, message: 'Allocation must be greater than 0' },
                  max: availableAllocation !== null
                    ? { value: availableAllocation, message: `Allocation cannot exceed available capacity (${availableAllocation}%)` }
                    : { value: 100, message: 'Allocation cannot exceed 100%' },
                })}
              />
              {errors.projectAssignmentAllocation && (
                <p className="text-sm text-destructive">{errors.projectAssignmentAllocation.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
