import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';
import { createAssignment } from '@/services/giftCardAssignment';
import { getPools } from '@/services/giftCardPool';
import { getReasons } from '@/services/giftCardReason';
import { getCardTypes } from '@/services/giftCardType';
import { getCardValues } from '@/services/giftCardValue';
import type { GiftCardPoolDTO } from '@shared/dto/GiftCardPool';
import type { GiftCardReasonDTO } from '@shared/dto/GiftCardReason';
import type { GiftCardTypeDTO } from '@shared/dto/GiftCardType';
import type { GiftCardValueDTO } from '@shared/dto/GiftCardValue';
import type { CountryDTO } from '@shared/dto';

interface FormData {
  countryId:        number;
  poolId:           number;
  reasonId:         number;
  cardTypeId:       number;
  cardValueId:      number;
  assignmentAmount: number;
  assignmentComment: string;
  assignmentEmailMessage: string;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function RequestFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [saving, setSaving]   = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [pools, setPools]         = useState<GiftCardPoolDTO[]>([]);
  const [reasons, setReasons]     = useState<GiftCardReasonDTO[]>([]);
  const [cardTypes, setCardTypes] = useState<GiftCardTypeDTO[]>([]);
  const [cardValues, setCardValues] = useState<GiftCardValueDTO[]>([]);

  const [recipients, setRecipients] = useState<string[]>(['']);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      countryId: 0, poolId: 0, reasonId: 0, cardTypeId: 0, cardValueId: 0,
      assignmentAmount: 1, assignmentComment: '', assignmentEmailMessage: '',
    }
  });

  const selectedCardTypeId = watch('cardTypeId');
  const amount = watch('assignmentAmount');

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      apiGet<CountryDTO[]>('/api/countries'),
      getPools(),
      getReasons(),
      getCardTypes(),
      getCardValues(),
    ]).then(([ctrs, pls, rsns, types, values]) => {
      setCountries(ctrs);
      setPools(pls.filter(p => p.poolIsActive));
      setReasons(rsns.filter(r => r.reasonIsActive));
      setCardTypes(types.filter(t => t.cardTypeIsActive));
      setCardValues(values.filter(v => v.cardValueIsActive));
      setLoadingOptions(false);
    }).catch(() => setLoadingOptions(false));

    reset({
      countryId: 0, poolId: 0, reasonId: 0, cardTypeId: 0, cardValueId: 0,
      assignmentAmount: 1, assignmentComment: '', assignmentEmailMessage: '',
    });
    setRecipients(['']);
    setRecipientsError(null);
  }, [open, reset]);

  const filteredCardValues = cardValues.filter(v => v.cardTypeId === Number(selectedCardTypeId));

  const handleAddRecipient = () => setRecipients(prev => [...prev, '']);
  const handleRemoveRecipient = (idx: number) => setRecipients(prev => prev.filter((_, i) => i !== idx));
  const handleRecipientChange = (idx: number, value: string) => {
    setRecipients(prev => prev.map((r, i) => i === idx ? value : r));
  };

  const onSave = async (data: FormData) => {
    const cleanRecipients = recipients.map(r => r.trim()).filter(r => r !== '');

    if (data.assignmentAmount > 1 && cleanRecipients.length !== data.assignmentAmount) {
      setRecipientsError(
        `${data.assignmentAmount} recipients are required for ${data.assignmentAmount} cards. Currently there are ${cleanRecipients.length}.`
      );
      return;
    }
    if (cleanRecipients.length < 1) {
      setRecipientsError('At least one recipient is required');
      return;
    }
    setRecipientsError(null);

    setSaving(true);
    try {
      await createAssignment({
        countryId:        Number(data.countryId),
        poolId:            Number(data.poolId),
        reasonId:          Number(data.reasonId),
        cardTypeId:        Number(data.cardTypeId),
        cardValueId:       Number(data.cardValueId),
        assignmentAmount:  Number(data.assignmentAmount),
        assignmentComment: data.assignmentComment || undefined,
        assignmentRecipients: cleanRecipients,
        assignmentEmailMessage: data.assignmentEmailMessage || undefined,
      });
      toast({ title: 'Request submitted', description: 'The gift card distribution request was created successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to submit request', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const countryOptions: ComboBoxOption[] = countries.map(c => ({ value: String(c.countryId), label: c.countryName }));
  const poolOptions: ComboBoxOption[] = pools.map(p => ({ value: String(p.poolId), label: p.poolName }));
  const reasonOptions: ComboBoxOption[] = reasons.map(r => ({ value: String(r.reasonId), label: r.reasonName }));
  const cardTypeOptions: ComboBoxOption[] = cardTypes.map(t => ({ value: String(t.cardTypeId), label: t.cardTypeName }));
  const cardValueOptions: ComboBoxOption[] = filteredCardValues.map(v => ({
    value: String(v.cardValueId),
    label: `${v.cardValueCurrency} ${v.cardValueAmount.toFixed(2)}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Distribution Request</DialogTitle>
          <DialogDescription>Fill in the details to request gift card distribution.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country <span className="text-destructive">*</span></Label>
              <Controller
                name="countryId"
                control={control}
                rules={{ validate: v => Number(v) > 0 || 'Country is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={countryOptions}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder={loadingOptions ? 'Loading...' : 'Select country...'}
                    searchPlaceholder="Search countries..."
                    emptyMessage="No countries found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Pool <span className="text-destructive">*</span></Label>
              <Controller
                name="poolId"
                control={control}
                rules={{ validate: v => Number(v) > 0 || 'Pool is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={poolOptions}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder={loadingOptions ? 'Loading...' : 'Select pool...'}
                    searchPlaceholder="Search pools..."
                    emptyMessage="No pools found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.poolId && <p className="text-sm text-destructive">{errors.poolId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Controller
                name="reasonId"
                control={control}
                rules={{ validate: v => Number(v) > 0 || 'Reason is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={reasonOptions}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder={loadingOptions ? 'Loading...' : 'Select reason...'}
                    searchPlaceholder="Search reasons..."
                    emptyMessage="No reasons found."
                    disabled={loadingOptions}
                  />
                )}
              />
              {errors.reasonId && <p className="text-sm text-destructive">{errors.reasonId.message}</p>}
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
                    onValueChange={(v) => { field.onChange(Number(v)); setValue('cardValueId', 0); }}
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
              <Label>Value <span className="text-destructive">*</span></Label>
              <Controller
                name="cardValueId"
                control={control}
                rules={{ validate: v => Number(v) > 0 || 'Value is required' }}
                render={({ field }) => (
                  <ComboBox
                    options={cardValueOptions}
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder={!selectedCardTypeId ? 'Select card type first' : 'Select value...'}
                    searchPlaceholder="Search values..."
                    emptyMessage="No values found for this card type."
                    disabled={loadingOptions || !selectedCardTypeId}
                  />
                )}
              />
              {errors.cardValueId && <p className="text-sm text-destructive">{errors.cardValueId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                step="1"
                {...register('assignmentAmount', {
                  required: 'Amount is required',
                  min: { value: 1, message: 'Must be at least 1' },
                  valueAsNumber: true,
                })}
              />
              {errors.assignmentAmount && <p className="text-sm text-destructive">{errors.assignmentAmount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea rows={2} {...register('assignmentComment')} placeholder="Optional comment..." />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Recipients <span className="text-destructive">*</span>
                {amount > 1 && <span className="text-muted-foreground"> ({recipients.filter(r => r.trim()).length}/{amount})</span>}
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRecipient}>+ Add email</Button>
            </div>
            <div className="space-y-2">
              {recipients.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={r}
                    onChange={(e) => handleRecipientChange(idx, e.target.value)}
                  />
                  {recipients.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveRecipient(idx)}>
                      <X size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {recipientsError && <p className="text-sm text-destructive">{recipientsError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email Message</Label>
            <Textarea rows={3} {...register('assignmentEmailMessage')} placeholder="Optional message to include in the email..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
