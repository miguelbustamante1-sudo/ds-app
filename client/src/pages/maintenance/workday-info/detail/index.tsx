import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import type { WorkdayInfoDTO, UpdateWorkdayInfoDTO } from '@shared/dto';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPut } from '@/lib/api';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { format } from 'date-fns';

const PARENTHOOD_OPTIONS: ComboBoxOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

interface WorkdayInfoFormData {
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

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = parseUTCDateAsLocal(date);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

export function WorkdayInfoDetailPage() {
  const { wdid } = useParams<{ wdid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate } = usePermissions();

  const [record, setRecord] = useState<WorkdayInfoDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<WorkdayInfoFormData>({
    defaultValues: {
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
    if (!wdid) return;
    apiGet<WorkdayInfoDTO>(`/api/workday-info/${wdid}`)
      .then((rec) => {
        setRecord(rec);
        reset({
          hireDate: toDateInputValue(rec.hireDate),
          corporateEmail: rec.corporateEmail ?? '',
          personalEmail: rec.personalEmail ?? '',
          cellphone: rec.cellphone ?? '',
          homePhone: rec.homePhone ?? '',
          birthDate: rec.birthDate ?? '',
          parenthood: rec.parenthood != null ? String(rec.parenthood) : '',
          workStyle: rec.workStyle ?? '',
          gender: rec.gender ?? '',
          billingStatus: rec.billingStatus ?? '',
          costCenterHierarchy: rec.costCenterHierarchy ?? '',
          costCenterNames: rec.costCenterNames ?? '',
          directManager: rec.directManager ?? '',
          vacation: rec.vacation != null ? String(rec.vacation) : '',
          personalDays: rec.personalDays != null ? String(rec.personalDays) : '',
        });
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load workday info record', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [wdid]);

  const onSubmit = async (data: WorkdayInfoFormData) => {
    if (!wdid) return;
    try {
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
      await apiPut<WorkdayInfoDTO, UpdateWorkdayInfoDTO>(`/api/workday-info/${wdid}`, payload);
      toast({ title: 'Success', description: 'Workday info record updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update workday info record', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 space-y-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        Workday info record not found.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>{`Workday Info — ${wdid ?? ''}`}</ToolbarPageTitle>
          <ToolbarDescription>Manage Workday employee information</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/maintenance/workday-info')}>
            <ArrowLeft size={16} className="me-1" />
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mt-6">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <CardTitle>Employee Details</CardTitle>
              {canCreate('WorkdayInfo') && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Parenthood</Label>
                <Controller
                  name="parenthood"
                  control={control}
                  render={({ field }) => (
                    <ComboBox
                      options={PARENTHOOD_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="— Not specified —"
                      searchPlaceholder="Search..."
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
