import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { createCardValue, updateCardValue } from '@/services/giftCardValue';
import { getCardTypes } from '@/services/giftCardType';
import type { GiftCardValueDTO } from '@shared/dto/GiftCardValue';
import type { GiftCardTypeDTO } from '@shared/dto/GiftCardType';

interface FormData {
  cardTypeId:        number;
  cardValueAmount:   number;
  cardValueCurrency: string;
}

interface Props {
  value:        GiftCardValueDTO | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function CardValueFormDialog({ value, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [saving, setSaving]               = useState(false);
  const [cardTypes, setCardTypes]         = useState<GiftCardTypeDTO[]>([]);
  const [loadingCardTypes, setLoadingCardTypes] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { cardTypeId: 0, cardValueAmount: 0, cardValueCurrency: 'USD' }
  });

  const isEdit = value !== null;

  useEffect(() => {
    if (!open) return;
    setLoadingCardTypes(true);
    getCardTypes().then(types => {
      setCardTypes(types.filter(t => t.cardTypeIsActive));
      setLoadingCardTypes(false);
    });
    if (isEdit && value) {
      reset({
        cardTypeId:        0,
        cardValueAmount:   value.cardValueAmount,
        cardValueCurrency: value.cardValueCurrency,
      });
    } else {
      reset({ cardTypeId: 0, cardValueAmount: 0, cardValueCurrency: 'USD' });
    }
  }, [open, value, isEdit, reset]);

  const onSave = async (data: FormData) => {
    setSaving(true);
    try {
      if (isEdit && value) {
        await updateCardValue(value.cardValueId, {
          cardValueAmount:   Number(data.cardValueAmount),
          cardValueCurrency: data.cardValueCurrency,
        });
        toast({ title: 'Updated', description: 'Card value updated successfully' });
      } else {
        await createCardValue({
          cardTypeId:        Number(data.cardTypeId),
          cardValueAmount:   Number(data.cardValueAmount),
          cardValueCurrency: data.cardValueCurrency,
        });
        toast({ title: 'Created', description: 'Card value created successfully' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Operation failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Card Value' : 'Add Card Value'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update amount or currency.' : 'Fill in the details to create a new card value.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Card Type <span className="text-destructive">*</span></Label>
              <ComboBox
                options={cardTypes.map((ct): ComboBoxOption => ({
                  value: String(ct.cardTypeId),
                  label: ct.cardTypeName,
                }))}
                value={String(watch('cardTypeId'))}
                onValueChange={(value) => setValue('cardTypeId', Number(value))}
                placeholder={loadingCardTypes ? 'Loading...' : 'Select a card type...'}
                searchPlaceholder="Search card types..."
                emptyMessage="No card types found."
                disabled={loadingCardTypes}
              />
              <input
                type="hidden"
                {...register('cardTypeId', {
                  required: 'Card type is required',
                  validate: v => Number(v) > 0 || 'Card type is required'
                })}
              />
              {errors.cardTypeId && <p className="text-sm text-destructive">{errors.cardTypeId.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 50.00"
              {...register('cardValueAmount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Must be greater than 0' },
                valueAsNumber: true,
              })}
            />
            {errors.cardValueAmount && <p className="text-sm text-destructive">{errors.cardValueAmount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Currency <span className="text-destructive">*</span></Label>
            <Input
              placeholder="USD"
              maxLength={3}
              {...register('cardValueCurrency', { required: 'Currency is required' })}
            />
            {errors.cardValueCurrency && <p className="text-sm text-destructive">{errors.cardValueCurrency.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}