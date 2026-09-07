import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { WorkdayInfoDTO, CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO } from '@shared/dto';
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
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { format } from 'date-fns';

interface WorkdayInfoFormData {
  wdid: string;
  hireDate: string;
  corporateEmail: string;
  personalEmail: string;
  cellphone: string;
  homePhone: string;
  birthDate: string;
  parenthood: string;
  workStyle: string;
  gender: string;
  billingStatus: string;
  costCenterHierarchy: string;
  costCenterNames: string;
  directManager: string;
  vacation: string;
  personalDays: string;
}

interface WorkdayInfoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: WorkdayInfoDTO;
  onSuccess: () => void;
}

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = parseUTCDateAsLocal(date);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

export function WorkdayInfoFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: WorkdayInfoFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkdayInfoFormData>({
    defaultValues: {
      wdid: '',
      hireDate: '',
      corporateEmail: '',
      personalEmail: '',
      cellphone: '',
      homePhone: '',
      birthDate: '',
      parenthood: '',
      workStyle: '',
      gender: '',
      billingStatus: '',
      costCenterHierarchy: '',
      costCenterNames: '',
      directManager: '',
      vacation: '',
      personalDays: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        wdid: record?.wdid ?? '',
        hireDate: toDateInputValue(record?.hireDate),
        corporateEmail: record?.corporateEmail ?? '',
        personalEmail: record?.personalEmail ?? '',
        cellphone: record?.cellphone ?? '',
        homePhone: record?.homePhone ?? '',
        birthDate: record?.birthDate ?? '',
        parenthood: record?.parenthood != null ? String(record.parenthood) : '',
        workStyle: record?.workStyle ?? '',
        gender: record?.gender ?? '',
        billingStatus: record?.billingStatus ?? '',
        costCenterHierarchy: record?.costCenterHierarchy ?? '',
        costCenterNames: record?.costCenterNames ?? '',
        directManager: record?.directManager ?? '',
        vacation: record?.vacation != null ? String(record.vacation) : '',
        personalDays: record?.personalDays != null ? String(record.personalDays) : '',
      });
    }
  }, [open, record, reset]);

  const onSubmit = async (data: WorkdayInfoFormData) => {
    try {
      if (isEditing) {
        const payload: UpdateWorkdayInfoDTO = {
          hireDate: data.hireDate || null,
          corporateEmail: data.corporateEmail.trim() || null,
          personalEmail: data.personalEmail.trim() || null,
          cellphone: data.cellphone.trim() || null,
          homePhone: data.homePhone.trim() || null,
          birthDate: data.birthDate.trim() || null,
          parenthood: data.parenthood === 'true' ? true : data.parenthood === 'false' ? false : null,
          workStyle: data.workStyle.trim() || null,
          gender: data.gender.trim() || null,
          billingStatus: data.billingStatus.trim() || null,
          costCenterHierarchy: data.costCenterHierarchy.trim() || null,
          costCenterNames: data.costCenterNames.trim() || null,
          directManager: data.directManager.trim() || null,
          vacation: data.vacation !== '' ? Number(data.vacation) : null,
          personalDays: data.personalDays !== '' ? Number(data.personalDays) : null,
        };
        await apiPut<WorkdayInfoDTO, UpdateWorkdayInfoDTO>(
          `/api/workday-info/${record.wdid}`,
          payload,
        );
        toast({ title: 'Success', description: 'Workday info record updated successfully' });
      } else {
        const payload: CreateWorkdayInfoDTO = {
          wdid: data.wdid.trim(),
          hireDate: data.hireDate || null,
          corporateEmail: data.corporateEmail.trim() || null,
          personalEmail: data.personalEmail.trim() || null,
          allEmails: [],
          cellphone: data.cellphone.trim() || null,
          homePhone: data.homePhone.trim() || null,
          birthDate: data.birthDate.trim() || null,
          parenthood: data.parenthood === 'true' ? true : data.parenthood === 'false' ? false : null,
          workStyle: data.workStyle.trim() || null,
          gender: data.gender.trim() || null,
          billingStatus: data.billingStatus.trim() || null,
          costCenterHierarchy: data.costCenterHierarchy.trim() || null,
          costCenterNames: data.costCenterNames.trim() || null,
          directManager: data.directManager.trim() || null,
          vacation: data.vacation !== '' ? Number(data.vacation) : null,
          personalDays: data.personalDays !== '' ? Number(data.personalDays) : null,
        };
        await apiPost<WorkdayInfoDTO, CreateWorkdayInfoDTO>('/api/workday-info', payload);
        toast({ title: 'Success', description: 'Workday info record created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} workday info record`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Workday Info' : 'New Workday Info Record'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the Workday info for ${record.wdid}.`
              : 'Enter the Workday employee information below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Workday ID — only on create */}
            {!isEditing && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="wdid">Workday ID *</Label>
                <Input
                  id="wdid"
                  placeholder="e.g., WD-00123"
                  {...register('wdid', { required: 'Workday ID is required' })}
                />
                {errors.wdid && <p className="text-sm text-destructive">{errors.wdid.message}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="corporateEmail">Corporate Email</Label>
              <Input id="corporateEmail" placeholder="user@company.com" {...register('corporateEmail')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email</Label>
              <Input id="personalEmail" placeholder="user@gmail.com" {...register('personalEmail')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input id="hireDate" type="date" {...register('hireDate')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input id="birthDate" placeholder="e.g., 1990-05-20" {...register('birthDate')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cellphone">Cellphone</Label>
              <Input id="cellphone" placeholder="+1 555 000 0000" {...register('cellphone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homePhone">Home Phone</Label>
              <Input id="homePhone" placeholder="+1 555 000 0001" {...register('homePhone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" placeholder="e.g., Male / Female" {...register('gender')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workStyle">Work Style</Label>
              <Input id="workStyle" placeholder="e.g., Remote / On-site" {...register('workStyle')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingStatus">Billing Status</Label>
              <Input id="billingStatus" placeholder="e.g., Billable" {...register('billingStatus')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="directManager">Direct Manager</Label>
              <Input id="directManager" placeholder="Manager name" {...register('directManager')} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="costCenterNames">Cost Center Names</Label>
              <Input id="costCenterNames" placeholder="e.g., Engineering" {...register('costCenterNames')} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="costCenterHierarchy">Cost Center Hierarchy</Label>
              <Input id="costCenterHierarchy" placeholder="e.g., Corp > Engineering > Backend" {...register('costCenterHierarchy')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacation">Vacation Days</Label>
              <Input id="vacation" type="number" step="0.5" placeholder="e.g., 15" {...register('vacation')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalDays">Personal Days</Label>
              <Input id="personalDays" type="number" step="0.5" placeholder="e.g., 3" {...register('personalDays')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parenthood">Parenthood</Label>
              <select
                id="parenthood"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('parenthood')}
              >
                <option value="">— Not specified —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
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
