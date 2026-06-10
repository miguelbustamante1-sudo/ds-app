import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ProjectAssignmentWithDetailsDTO, UpdateProjectAssignmentDTO } from '@shared/dto';
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
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/lib/api';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { ContactComboBox } from './components/ContactComboBox';
import { getShifts } from '@/services/shift';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: ProjectAssignmentWithDetailsDTO | null;
  clientId: number | null;
  onSuccess: () => void;
}

interface FormData {
  projectAssignmentStartDate: string;
  projectAssignmentEndDate: string;
  projectAssignmentBillRate: string;
  projectAssignmentBillRateCurrency: string;
  projectAssignmentAllocation: string;
  shiftId: string;
  clientContactId: string;
}

export function EditAssignmentDialog({ open, onOpenChange, assignment, clientId, onSuccess }: Props) {
  const { toast } = useToast();
  const [allShifts, setAllShifts] = useState<ShiftDTO[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [contactId, setContactId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (!open) return;
    getShifts().then(setAllShifts).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open && assignment) {
      const startStr = assignment.projectAssignmentStartDate
        ? formatUTCDate(assignment.projectAssignmentStartDate, 'yyyy-MM-dd')
        : '';
      const endStr = assignment.projectAssignmentEndDate
        ? formatUTCDate(assignment.projectAssignmentEndDate, 'yyyy-MM-dd')
        : '';
      const shiftStr = assignment.shiftId?.toString() ?? '';
      const contactStr = assignment.clientContactId?.toString() ?? '';

      reset({
        projectAssignmentStartDate: startStr,
        projectAssignmentEndDate: endStr,
        projectAssignmentBillRate: assignment.projectAssignmentBillRate?.toString() ?? '',
        projectAssignmentBillRateCurrency: assignment.projectAssignmentBillRateCurrency ?? '',
        projectAssignmentAllocation: assignment.projectAssignmentAllocation?.toString() ?? '',
        shiftId: shiftStr,
        clientContactId: contactStr,
      });
      setShiftId(shiftStr);
      setContactId(contactStr);
    }
  }, [open, assignment, reset]);

  const fullName = assignment?.teamMemberName ?? 'Team Member';

  const onSubmit = async (data: FormData) => {
    if (!assignment) return;
    try {
      const payload: UpdateProjectAssignmentDTO = {
        projectAssignmentStartDate: data.projectAssignmentStartDate,
        projectAssignmentEndDate: data.projectAssignmentEndDate || null,
        projectAssignmentBillRate: Number(data.projectAssignmentBillRate),
        projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency.toUpperCase(),
        projectAssignmentAllocation: Number(data.projectAssignmentAllocation),
        shiftId: data.shiftId ? Number(data.shiftId) : null,
        clientContactId: data.clientContactId ? Number(data.clientContactId) : null,
      };
      await apiPut(`/api/team-member-projects/${assignment.projectAssignmentId}`, payload);
      toast({ title: 'Success', description: 'Assignment updated successfully.' });
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'Failed to update assignment. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Assignment — {fullName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
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
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register('projectAssignmentEndDate', {
                  validate: (val, formValues) => {
                    if (!val) return true;
                    return (
                      parseUTCDateAsLocal(val) > parseUTCDateAsLocal(formValues.projectAssignmentStartDate) ||
                      'End date must be after start date'
                    );
                  },
                })}
              />
              {errors.projectAssignmentEndDate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentEndDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billRate">
                Hourly Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="billRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                {...register('projectAssignmentBillRate', {
                  required: 'Hourly rate is required',
                  min: { value: 0, message: 'Rate must be 0 or greater' },
                })}
              />
              {errors.projectAssignmentBillRate && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency"
                type="text"
                maxLength={3}
                placeholder="USD"
                {...register('projectAssignmentBillRateCurrency', {
                  required: 'Currency is required',
                  maxLength: { value: 3, message: 'Must be 3 characters' },
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
              />
              {errors.projectAssignmentBillRateCurrency && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRateCurrency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation">
                Allocation % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="allocation"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                placeholder="e.g., 100"
                {...register('projectAssignmentAllocation', {
                  required: 'Allocation is required',
                  min: { value: 0.01, message: 'Must be greater than 0' },
                  max: { value: 100, message: 'Cannot exceed 100%' },
                })}
              />
              {errors.projectAssignmentAllocation && (
                <p className="text-sm text-destructive">{errors.projectAssignmentAllocation.message}</p>
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
                searchPlaceholder="Search..."
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
