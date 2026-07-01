import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { createDocumentation } from '@/services/giftCardDocumentation';
import { getCardTypes } from '@/services/giftCardType';
import { getAssignments } from '@/services/giftCardAssignment';
import type { GiftCardTypeDTO } from '@shared/dto/GiftCardType';
import type { GiftCardAssignmentDTO } from '@shared/dto/GiftCardAssignment';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface FormData {
  assignmentId:   number;
  value:          number;
  cardTypeId:     number;
  cardNumber:     string;
  amountNotSpent: string;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function DocumentationFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [saving, setSaving]             = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [cardTypes, setCardTypes]       = useState<GiftCardTypeDTO[]>([]);
  const [assignments, setAssignments]   = useState<GiftCardAssignmentDTO[]>([]);
  const [file, setFile]                 = useState<File | null>(null);
  const [fileError, setFileError]       = useState<string | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<FormData>({
      defaultValues: {
        assignmentId: 0, value: 0, cardTypeId: 0, cardNumber: '', amountNotSpent: '',
      },
    });

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    setFile(null);
    setFileError(null);
    reset({ assignmentId: 0, value: 0, cardTypeId: 0, cardNumber: '', amountNotSpent: '' });
    Promise.all([getCardTypes(), getAssignments()])
      .then(([types, asgns]) => {
        setCardTypes(types.filter(t => t.cardTypeIsActive));
        setAssignments(asgns);
        setLoadingOptions(false);
      })
      .catch(() => setLoadingOptions(false));
  }, [open, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!selected) { setFile(null); return; }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError('Only JPG, PNG, and PDF files are accepted.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFileError('File exceeds the 10 MB limit.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const uploadFile = async (f: File): Promise<number> => {
    const form = new FormData();
    form.append('file', f);
    const response = await fetch('/api/uploads', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? 'File upload failed');
    }
    const body = await response.json() as { data: { uploadId: number } };
    return body.data.uploadId;
  };

  const onSave = async (data: FormData) => {
    if (!file) { setFileError('An image or PDF of the receipt is required.'); return; }

    setSaving(true);
    try {
      const uploadId = await uploadFile(file);

      await createDocumentation({
        assignmentId:   Number(data.assignmentId),
        value:          Number(data.value),
        cardTypeId:     Number(data.cardTypeId),
        cardNumber:     data.cardNumber.trim(),
        uploadId,
        amountNotSpent: data.amountNotSpent !== '' ? Number(data.amountNotSpent) : undefined,
      });

      toast({ title: 'Documentation saved', description: 'The card usage record was created successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save documentation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const assignmentOptions: ComboBoxOption[] = assignments.map(a => ({
    value: String(a.assignmentId),
    label: `#${a.assignmentId} — ${a.poolName} / ${a.reasonName}`,
  }));

  const cardTypeOptions: ComboBoxOption[] = cardTypes.map(t => ({
    value: String(t.cardTypeId),
    label: t.cardTypeName,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Documentation Record</DialogTitle>
          <DialogDescription>Register the actual usage of a distributed gift card.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Assignment <span className="text-destructive">*</span></Label>
            <Controller
              name="assignmentId"
              control={control}
              rules={{ validate: v => Number(v) > 0 || 'Assignment is required' }}
              render={({ field }) => (
                <ComboBox
                  options={assignmentOptions}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                  placeholder={loadingOptions ? 'Loading...' : 'Select assignment...'}
                  searchPlaceholder="Search assignments..."
                  emptyMessage="No assignments found."
                  disabled={loadingOptions}
                />
              )}
            />
            {errors.assignmentId && <p className="text-sm text-destructive">{errors.assignmentId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Value <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...register('value', {
                  required: 'Value is required',
                  min: { value: 0.01, message: 'Must be greater than 0' },
                  valueAsNumber: true,
                })}
              />
              {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Amount Not Spent</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amountNotSpent', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
              />
              {errors.amountNotSpent && <p className="text-sm text-destructive">{errors.amountNotSpent.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type of Card <span className="text-destructive">*</span></Label>
            <Controller
              name="cardTypeId"
              control={control}
              rules={{ validate: v => Number(v) > 0 || 'Card type is required' }}
              render={({ field }) => (
                <ComboBox
                  options={cardTypeOptions}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                  placeholder={loadingOptions ? 'Loading...' : 'Select card type...'}
                  searchPlaceholder="Search card types..."
                  emptyMessage="No card types found."
                  disabled={loadingOptions}
                />
              )}
            />
            {errors.cardTypeId && <p className="text-sm text-destructive">{errors.cardTypeId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Card # <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Card number or identifier"
              {...register('cardNumber', { required: 'Card number is required' })}
            />
            {errors.cardNumber && <p className="text-sm text-destructive">{errors.cardNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Receipt / Proof <span className="text-destructive">*</span></Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
