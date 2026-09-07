// client/src/pages/laptop-inventory/form.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type {
  CreateLaptopDTO,
  UpdateLaptopDTO,
  LaptopDTO,
  TeamMemberDTO,
} from '@shared/dto';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

const REGIONS: ComboBoxOption[] = [
  { value: 'Guatemala',   label: 'Guatemala' },
  { value: 'El Salvador', label: 'El Salvador' },
  { value: 'Mexico',      label: 'Mexico' },
];

const STATUSES: ComboBoxOption[] = [
  { value: 'Available',              label: 'Available' },
  { value: 'Assigned',               label: 'Assigned' },
  { value: 'Reserved',               label: 'Reserved' },
  { value: 'Damaged',                label: 'Damaged' },
  { value: 'Permanently Damaged',    label: 'Permanently Damaged' },
  { value: 'In Warranty',            label: 'In Warranty' },
  { value: 'New',                    label: 'New' },
  { value: 'Removed',                label: 'Removed' },
  { value: 'Assigned Outside DS',    label: 'Assigned Outside DS' },
  { value: 'Assigned Non Arturo Org', label: 'Assigned Non Arturo Org' },
  { value: 'Emergency assignment',   label: 'Emergency assignment' },
];

const CATEGORIES: ComboBoxOption[] = [
  { value: 'Laptop',    label: 'Laptop' },
  { value: 'Cellphone', label: 'Cellphone' },
];

interface FormData {
  serialNumber:    string;
  assetNumber:     string;
  model:           string;
  brand:           string;
  code:            string;
  ramGb:           string;
  storageGb:       string;
  region:          string;
  purchaseDate:    string;
  po:              string;
  category:        string;
  site:            string;
  status:          string;
  comments:        string;
  deviceName:      string;
  osVersion:       string;
  blueprintName:   string;
  tags:            string; // comma-separated in the UI, split/joined on submit
  lastCheckIn:     string; // datetime-local value
  usable:          boolean;
  teamMemberId:    string;
  assignmentNotes: string;
}

function toDatetimeLocal(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface LaptopFormDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  record?:      LaptopDTO;
  onSuccess:    () => void;
}

export function LaptopFormDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: LaptopFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      serialNumber:    '',
      assetNumber:     '',
      model:           '',
      brand:           '',
      code:            '',
      ramGb:           '',
      storageGb:       '',
      region:          '',
      purchaseDate:    '',
      po:              '',
      category:        'Laptop',
      site:            '',
      status:          'Available',
      comments:        '',
      deviceName:      '',
      osVersion:       '',
      blueprintName:   '',
      tags:            '',
      lastCheckIn:     '',
      usable:          true,
      teamMemberId:    '',
      assignmentNotes: '',
    },
  });

  const watchedTeamMemberId = watch('teamMemberId');
  const watchedRegion       = watch('region');
  const watchedStatus       = watch('status');
  const watchedCategory     = watch('category');

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: m.workdayId
      ? `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`
      : `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    apiGet<TeamMemberDTO[]>('/api/team-members')
      .then(setTeamMembers)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' });
      })
      .finally(() => setLoadingOptions(false));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    if (isEditing && record) {
      reset({
        serialNumber:    record.serialNumber,
        assetNumber:     record.assetNumber ?? '',
        model:           record.model ?? '',
        brand:           record.brand ?? '',
        code:            record.code ?? '',
        ramGb:           record.ramGb ?? '',
        storageGb:       record.storageGb ?? '',
        region:          record.region ?? '',
        purchaseDate:    record.purchaseDate
          ? String(record.purchaseDate).slice(0, 10)
          : '',
        po:              record.po ?? '',
        category:        record.category ?? 'Laptop',
        site:            record.site ?? '',
        status:          record.status,
        comments:        record.comments ?? '',
        deviceName:      record.deviceName ?? '',
        osVersion:       record.osVersion ?? '',
        blueprintName:   record.blueprintName ?? '',
        tags:            record.tags.join(', '),
        lastCheckIn:     toDatetimeLocal(record.lastCheckIn),
        usable:          record.usable,
        teamMemberId:    record.activeAssignment?.teamMemberId.toString() ?? '',
        assignmentNotes: record.activeAssignment?.notes ?? '',
      });
    } else {
      reset({
        serialNumber: '', assetNumber: '', model: '', brand: '', code: '',
        ramGb: '', storageGb: '', region: '', purchaseDate: '', po: '',
        category: 'Laptop', site: '', status: 'Available', comments: '',
        deviceName: '', osVersion: '', blueprintName: '', tags: '', lastCheckIn: '',
        usable: true, teamMemberId: '', assignmentNotes: '',
      });
    }
  }, [open, isEditing, record, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const teamMemberId = data.teamMemberId ? parseInt(data.teamMemberId, 10) : null;
      const tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const lastCheckIn = data.lastCheckIn ? new Date(data.lastCheckIn).toISOString() : null;

      if (isEditing && record) {
        const payload: UpdateLaptopDTO = {
          assetNumber:     data.assetNumber  || null,
          model:           data.model        || null,
          brand:           data.brand        || null,
          code:            data.code         || null,
          ramGb:           data.ramGb        || null,
          storageGb:       data.storageGb    || null,
          region:          data.region       || null,
          purchaseDate:    data.purchaseDate || null,
          po:              data.po           || null,
          usable:          data.usable,
          category:        data.category     || null,
          site:            data.site         || null,
          status:          data.status,
          comments:        data.comments     || null,
          deviceName:      data.deviceName    || null,
          osVersion:       data.osVersion     || null,
          blueprintName:   data.blueprintName || null,
          tags,
          lastCheckIn,
          teamMemberId,
          assignmentNotes: data.assignmentNotes || null,
        };
        await apiPut<LaptopDTO, UpdateLaptopDTO>(`/api/laptops/${record.laptopId}`, payload);
        toast({ title: 'Success', description: `Laptop ${data.serialNumber} updated.` });
      } else {
        const payload: CreateLaptopDTO = {
          serialNumber:    data.serialNumber.trim(),
          assetNumber:     data.assetNumber  || null,
          model:           data.model        || null,
          brand:           data.brand        || null,
          code:            data.code         || null,
          ramGb:           data.ramGb        || null,
          storageGb:       data.storageGb    || null,
          region:          data.region       || null,
          purchaseDate:    data.purchaseDate || null,
          po:              data.po           || null,
          usable:          data.usable,
          category:        data.category     || null,
          site:            data.site         || null,
          status:          data.status,
          comments:        data.comments     || null,
          deviceName:      data.deviceName    || null,
          osVersion:       data.osVersion     || null,
          blueprintName:   data.blueprintName || null,
          tags,
          lastCheckIn,
          teamMemberId,
          assignmentNotes: data.assignmentNotes || null,
        };
        await apiPost<LaptopDTO, CreateLaptopDTO>('/api/laptops', payload);
        toast({ title: 'Success', description: `Laptop ${data.serialNumber} added.` });
      }
      onSuccess();
    } catch (error: unknown) {
      toast({
        title:       'Error',
        description: error instanceof Error ? error.message : 'Failed to save laptop',
        variant:     'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Laptop' : 'Add Laptop'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4 py-4">

            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">
                Serial Number {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="serialNumber"
                {...register('serialNumber', { required: !isEditing ? 'Serial number is required' : false })}
                disabled={isEditing}
              />
              {errors.serialNumber && (
                <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
              )}
            </div>

            {/* Asset Number */}
            <div className="space-y-2">
              <Label htmlFor="assetNumber">Asset Number (AF)</Label>
              <Input id="assetNumber" {...register('assetNumber')} />
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...register('model')} />
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>Region</Label>
              <ComboBox
                options={REGIONS}
                value={watchedRegion}
                onValueChange={(v) => setValue('region', v)}
                placeholder="Select region"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <ComboBox
                options={STATUSES}
                value={watchedStatus}
                onValueChange={(v) => setValue('status', v)}
                placeholder="Select status"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <ComboBox
                options={CATEGORIES}
                value={watchedCategory}
                onValueChange={(v) => setValue('category', v)}
                placeholder="Select category"
              />
            </div>

            {/* RAM */}
            <div className="space-y-2">
              <Label htmlFor="ramGb">RAM</Label>
              <Input id="ramGb" {...register('ramGb')} placeholder="e.g. 16 GB" />
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <Label htmlFor="storageGb">Storage</Label>
              <Input id="storageGb" {...register('storageGb')} placeholder="e.g. 512 GB" />
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
            </div>

            {/* PO */}
            <div className="space-y-2">
              <Label htmlFor="po">PO</Label>
              <Input id="po" {...register('po')} />
            </div>

            {/* Site */}
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input id="site" {...register('site')} />
            </div>

            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input id="deviceName" {...register('deviceName')} />
            </div>

            {/* OS Version */}
            <div className="space-y-2">
              <Label htmlFor="osVersion">OS Version</Label>
              <Input id="osVersion" {...register('osVersion')} placeholder="e.g. 15.7.7" />
            </div>

            {/* Blueprint Name */}
            <div className="space-y-2">
              <Label htmlFor="blueprintName">Blueprint</Label>
              <Input id="blueprintName" {...register('blueprintName')} placeholder="e.g. TDS - Prod" />
            </div>

            {/* Last Check-In */}
            <div className="space-y-2">
              <Label htmlFor="lastCheckIn">Last Check-In</Label>
              <Input id="lastCheckIn" type="datetime-local" {...register('lastCheckIn')} />
            </div>

            {/* Tags — full width */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" {...register('tags')} placeholder="Comma-separated, e.g. TIDS Hire, WM-Fir" />
            </div>

            {/* Usable */}
            <div className="flex items-center gap-3 pt-6">
              <Controller
                name="usable"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="usable"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="usable">Usable</Label>
            </div>

            {/* Comments — full width */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Input id="comments" {...register('comments')} />
            </div>

            {/* Assignee — full width */}
            <div className="col-span-2 space-y-2">
              <Label>Assignee</Label>
              <ComboBox
                options={teamMemberOptions}
                value={watchedTeamMemberId}
                onValueChange={(v) => setValue('teamMemberId', v)}
                placeholder={loadingOptions ? 'Loading...' : 'Search team member...'}
                disabled={loadingOptions}
              />
            </div>

            {/* Assignment Notes — full width */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="assignmentNotes">Assignment Notes</Label>
              <Input id="assignmentNotes" {...register('assignmentNotes')} />
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
            <Button type="submit" disabled={isSubmitting || loadingOptions}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Laptop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
