import { useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { createCardType, updateCardType, type GiftCardTypeDTO } from '@/services/giftCardType';

interface FormData {
  cardTypeName: string;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
  cardType?:    GiftCardTypeDTO | null;
}

export function CardTypeFormDialog({ open, onOpenChange, onSuccess, cardType }: Props) {
  const { toast } = useToast();
  const isEdit = !!cardType;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { cardTypeName: '' } });

  useEffect(() => {
    if (!open) return;
    reset({ cardTypeName: cardType?.cardTypeName ?? '' });
  }, [open, cardType, reset]);

  const onSave = async (data: FormData) => {
    try {
      if (isEdit && cardType) {
        await updateCardType(cardType.cardTypeId, { cardTypeName: data.cardTypeName });
        toast({ title: 'Updated', description: `Card type "${data.cardTypeName}" updated successfully.` });
      } else {
        await createCardType({ cardTypeName: data.cardTypeName });
        toast({ title: 'Created', description: `Card type "${data.cardTypeName}" created successfully.` });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : `Failed to ${isEdit ? 'update' : 'create'} card type`;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Card Type' : 'Add Card Type'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the card type name below.' : 'Fill in the details to create a new card type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cardTypeName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cardTypeName"
                placeholder="e.g. Amazon"
                {...register('cardTypeName', { required: 'Name is required' })}
              />
              {errors.cardTypeName && (
                <p className="text-sm text-destructive">{errors.cardTypeName.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}