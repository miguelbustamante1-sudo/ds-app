import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { BenchAvailableMemberDTO, FunctionalAreaDTO } from '@shared/dto';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/api';
import { ContactComboBox } from './components/ContactComboBox';
import { getShifts } from '@/services/shift';
import { parseUTCDateAsLocal } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  clientId: number | null;
  projectName: string | null;
  onSuccess: () => void;
}

interface FormData {
  projectAssignmentStartDate: string;
  projectAssignmentEndDate: string;
  projectAssignmentBillRate: string;
  projectAssignmentBillRateCurrency: string;
  projectAssignmentAllocation: string;
  functionalAreaId: string;
  shiftId: string;
  clientContactId: string;
}

export function AddMemberModal({
  open,
  onOpenChange,
  projectId,
  clientId,
  projectName,
  onSuccess,
}: Props) {
  const { toast } = useToast();

  const [benchMembers, setBenchMembers] = useState<BenchAvailableMemberDTO[]>([]);
  const [benchLoading, setBenchLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [allFunctionalAreas, setAllFunctionalAreas] = useState<FunctionalAreaDTO[]>([]);
  const [allShifts, setAllShifts] = useState<ShiftDTO[]>([]);
  const [functionalAreaId, setFunctionalAreaId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [contactId, setContactId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      projectAssignmentStartDate: '',
      projectAssignmentEndDate: '',
      projectAssignmentBillRate: '',
      projectAssignmentBillRateCurrency: '',
      projectAssignmentAllocation: '',
      functionalAreaId: '',
      shiftId: '',
      clientContactId: '',
    },
  });

  useEffect(() => {
    if (!open) return;

    setBenchLoading(true);
    apiGet<BenchAvailableMemberDTO[]>('/api/team-member-projects/bench-available')
      .then(setBenchMembers)
      .catch(() => toast({ title: 'Error', description: 'Failed to load available members.', variant: 'destructive' }))
      .finally(() => setBenchLoading(false));

    apiGet<FunctionalAreaDTO[]>('/api/functional-areas')
      .then(setAllFunctionalAreas)
      .catch(() => {});

    getShifts()
      .then(setAllShifts)
      .catch(() => {});
  }, [open, toast]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return benchMembers.filter((m) =>
      `${m.teamMemberNames} ${m.teamMemberSurnames}`.toLowerCase().includes(q),
    );
  }, [benchMembers, search]);

  function toggleMember(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleClose() {
    reset();
    setSelectedIds(new Set());
    setSearch('');
    setFunctionalAreaId('');
    setShiftId('');
    setContactId('');
    onOpenChange(false);
  }

  const onSubmit = async (data: FormData) => {
    if (selectedIds.size === 0) {
      toast({ title: 'Error', description: 'Select at least one team member.', variant: 'destructive' });
      return;
    }

    const ids = [...selectedIds];
    let successCount = 0;
    let failCount = 0;

    for (const teamMemberId of ids) {
      try {
        await apiPost('/api/team-member-projects', {
          teamMemberId,
          projectId,
          projectAssignmentStartDate: data.projectAssignmentStartDate,
          projectAssignmentEndDate: data.projectAssignmentEndDate || null,
          projectAssignmentBillRate: Number(data.projectAssignmentBillRate),
          projectAssignmentBillRateCurrency: data.projectAssignmentBillRateCurrency.toUpperCase(),
          projectAssignmentAllocation: Number(data.projectAssignmentAllocation),
          functionalAreaId: Number(data.functionalAreaId),
          clientContactId: data.clientContactId ? Number(data.clientContactId) : null,
          shiftId: data.shiftId ? Number(data.shiftId) : null,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: 'Success', description: `${successCount} member${successCount !== 1 ? 's' : ''} added to project.` });
    }
    if (failCount > 0) {
      toast({ title: 'Warning', description: `${failCount} assignment${failCount !== 1 ? 's' : ''} failed (member may already be assigned).`, variant: 'destructive' });
    }

    if (successCount > 0) {
      handleClose();
      onSuccess();
    }
  };

  const allSelected = filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.has(m.teamMemberId));
  const someSelected = filteredMembers.some((m) => selectedIds.has(m.teamMemberId)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredMembers.forEach((m) => next.delete(m.teamMemberId));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredMembers.forEach((m) => next.add(m.teamMemberId));
        return next;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Team Member to Project</DialogTitle>
          {projectName && <p className="text-sm text-muted-foreground">{projectName}</p>}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 gap-6 overflow-hidden min-h-0">
          {/* Left panel — assignment details */}
          <div className="w-72 shrink-0 overflow-y-auto space-y-4 pr-1">
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
              <Label htmlFor="projectAssignmentBillRate">
                Hourly Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectAssignmentBillRate"
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
                  maxLength: { value: 3, message: 'Must be 3 characters' },
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
              />
              {errors.projectAssignmentBillRateCurrency && (
                <p className="text-sm text-destructive">{errors.projectAssignmentBillRateCurrency.message}</p>
              )}
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
                Functional Area <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={allFunctionalAreas.map((fa): ComboBoxOption => ({ value: String(fa.Id), label: fa.Name }))}
                value={functionalAreaId}
                onValueChange={(val) => {
                  setFunctionalAreaId(val);
                  setValue('functionalAreaId', val, { shouldValidate: true });
                }}
                placeholder="Select functional area..."
                searchPlaceholder="Search..."
                emptyMessage="No functional areas found."
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

          {/* Divider */}
          <div className="w-px bg-border shrink-0" />

          {/* Right panel — bench-available members */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                Available Members
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedIds.size} selected</Badge>
                )}
              </p>
            </div>

            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 h-8"
            />

            {/* Header row */}
            <div className="flex items-center gap-3 px-3 py-2 border-b text-xs text-muted-foreground font-medium">
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={toggleAll}
                disabled={filteredMembers.length === 0}
                aria-label="Select all visible"
              />
              <span className="flex-1">Name</span>
              <span className="w-20 text-right">Allocation</span>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto">
              {benchLoading && (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-1">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              )}

              {!benchLoading && filteredMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? 'No members match your search.' : 'No available members.'}
                </p>
              )}

              {!benchLoading &&
                filteredMembers.map((m) => (
                  <div
                    key={m.teamMemberId}
                    className="flex items-center gap-3 px-3 py-2 border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleMember(m.teamMemberId)}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(m.teamMemberId)}
                        onCheckedChange={() => toggleMember(m.teamMemberId)}
                        aria-label={`Select ${m.teamMemberNames} ${m.teamMemberSurnames}`}
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.teamMemberNames} {m.teamMemberSurnames}
                      </p>
                      {m.teamMemberSeniority && (
                        <p className="text-xs text-muted-foreground">{m.teamMemberSeniority}</p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground w-20 text-right shrink-0">
                      {m.totalAllocation}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </form>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form=""
            disabled={isSubmitting || selectedIds.size === 0}
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting
              ? 'Adding...'
              : selectedIds.size > 0
                ? `Add ${selectedIds.size} Member${selectedIds.size !== 1 ? 's' : ''}`
                : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
