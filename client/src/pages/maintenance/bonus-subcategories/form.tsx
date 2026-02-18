import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type {
  BonusSubcategoryDTO,
  CreateBonusSubcategoryDTO,
  UpdateBonusSubcategoryDTO,
  BonusCategoryDTO,
  CountryDTO,
} from '@shared/dto';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/api';

const FIELD_TYPES = ['text', 'number', 'date', 'boolean'] as const;

interface MetadataField {
  fieldName: string;
  fieldType: string;
}

interface BonusSubcategoryFormData {
  bonusCategoryId: string;
  countryId: string;
  bonusSubcategoryName: string;
  bonusSubcategoryDefaultAmount: string;
  metadataFields: MetadataField[];
}

interface BonusSubcategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonusSubcategory?: BonusSubcategoryDTO;
  onSuccess: () => void;
}

function metadataToFields(metadata: Record<string, string>): MetadataField[] {
  return Object.entries(metadata).map(([fieldName, fieldType]) => ({
    fieldName,
    fieldType,
  }));
}

function fieldsToMetadata(fields: MetadataField[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields) {
    if (field.fieldName.trim()) {
      result[field.fieldName.trim()] = field.fieldType;
    }
  }
  return result;
}

export function BonusSubcategoryFormDialog({
  open,
  onOpenChange,
  bonusSubcategory,
  onSuccess,
}: BonusSubcategoryFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!bonusSubcategory;
  const [categories, setCategories] = useState<BonusCategoryDTO[]>([]);
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BonusSubcategoryFormData>({
    defaultValues: {
      bonusCategoryId: '',
      countryId: '',
      bonusSubcategoryName: '',
      bonusSubcategoryDefaultAmount: '',
      metadataFields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'metadataFields',
  });

  const watchedCategoryId = watch('bonusCategoryId');
  const watchedCountryId = watch('countryId');

  useEffect(() => {
    if (open) {
      setLoadingDropdowns(true);
      Promise.all([
        apiGet<BonusCategoryDTO[]>('/api/bonus-categories'),
        apiGet<CountryDTO[]>('/api/countries'),
      ])
        .then(([cats, ctrs]) => {
          setCategories(cats);
          setCountries(ctrs);
        })
        .catch(() =>
          toast({ title: 'Error', description: 'Failed to load dropdown data', variant: 'destructive' })
        )
        .finally(() => setLoadingDropdowns(false));
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (bonusSubcategory) {
        reset({
          bonusCategoryId: bonusSubcategory.bonusCategoryId.toString(),
          countryId: bonusSubcategory.countryId.toString(),
          bonusSubcategoryName: bonusSubcategory.bonusSubcategoryName,
          bonusSubcategoryDefaultAmount:
            bonusSubcategory.bonusSubcategoryDefaultAmount != null
              ? String(bonusSubcategory.bonusSubcategoryDefaultAmount)
              : '',
          metadataFields: metadataToFields(bonusSubcategory.bonusSubcategoryMetadata ?? {}),
        });
      } else {
        reset({
          bonusCategoryId: '',
          countryId: '',
          bonusSubcategoryName: '',
          bonusSubcategoryDefaultAmount: '',
          metadataFields: [],
        });
      }
    }
  }, [open, bonusSubcategory, reset]);

  const onSubmit = async (data: BonusSubcategoryFormData) => {
    try {
      const metadata = fieldsToMetadata(data.metadataFields);

      if (isEditing) {
        const payload: UpdateBonusSubcategoryDTO = {
          bonusCategoryId: Number(data.bonusCategoryId),
          countryId: Number(data.countryId),
          bonusSubcategoryName: data.bonusSubcategoryName.trim(),
          bonusSubcategoryMetadata: metadata,
          bonusSubcategoryDefaultAmount: data.bonusSubcategoryDefaultAmount
            ? Number(data.bonusSubcategoryDefaultAmount)
            : null,
        };
        await apiPut<BonusSubcategoryDTO, UpdateBonusSubcategoryDTO>(
          `/api/bonus-subcategories/${bonusSubcategory.bonusSubcategoryId}`,
          payload
        );
        toast({ title: 'Success', description: 'Bonus subcategory updated successfully' });
      } else {
        const payload: CreateBonusSubcategoryDTO = {
          bonusCategoryId: Number(data.bonusCategoryId),
          countryId: Number(data.countryId),
          bonusSubcategoryName: data.bonusSubcategoryName.trim(),
          bonusSubcategoryMetadata: metadata,
          bonusSubcategoryDefaultAmount: data.bonusSubcategoryDefaultAmount
            ? Number(data.bonusSubcategoryDefaultAmount)
            : null,
        };
        await apiPost<BonusSubcategoryDTO, CreateBonusSubcategoryDTO>(
          '/api/bonus-subcategories',
          payload
        );
        toast({ title: 'Success', description: 'Bonus subcategory created successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} bonus subcategory`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Bonus Subcategory' : 'New Bonus Subcategory'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the bonus subcategory information below.'
              : 'Fill in the details to create a new bonus subcategory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedCategoryId}
                onValueChange={(value) => setValue('bonusCategoryId', value)}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingDropdowns ? 'Loading...' : 'Select a category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.bonusCategoryId} value={cat.bonusCategoryId.toString()}>
                      {cat.bonusCategoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('bonusCategoryId', { required: 'Category is required' })} />
              {errors.bonusCategoryId && (
                <p className="text-sm text-destructive">{errors.bonusCategoryId.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label>
                Country <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedCountryId}
                onValueChange={(value) => setValue('countryId', value)}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingDropdowns ? 'Loading...' : 'Select a country'} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((ctr) => (
                    <SelectItem key={ctr.countryId} value={ctr.countryId.toString()}>
                      {ctr.countryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('countryId', { required: 'Country is required' })} />
              {errors.countryId && (
                <p className="text-sm text-destructive">{errors.countryId.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="bonusSubcategoryName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bonusSubcategoryName"
                placeholder="e.g., Relocation Allowance"
                {...register('bonusSubcategoryName', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.bonusSubcategoryName && (
                <p className="text-sm text-destructive">{errors.bonusSubcategoryName.message}</p>
              )}
            </div>

            {/* Default Amount */}
            <div className="space-y-2">
              <Label htmlFor="bonusSubcategoryDefaultAmount">Default Amount</Label>
              <Input
                id="bonusSubcategoryDefaultAmount"
                type="number"
                step="0.01"
                placeholder="Optional"
                {...register('bonusSubcategoryDefaultAmount')}
              />
            </div>

            {/* Dynamic Metadata Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dynamic Fields (Metadata Schema)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ fieldName: '', fieldType: 'text' })}
                >
                  <Plus size={14} className="me-1" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No dynamic fields defined. Click "Add Field" to define custom data points.
                </p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Field name"
                      {...register(`metadataFields.${index}.fieldName`, {
                        required: 'Field name is required',
                      })}
                    />
                    {errors.metadataFields?.[index]?.fieldName && (
                      <p className="text-xs text-destructive">
                        {errors.metadataFields[index].fieldName?.message}
                      </p>
                    )}
                  </div>
                  <div className="w-36">
                    <Select
                      value={watch(`metadataFields.${index}.fieldType`)}
                      onValueChange={(value) =>
                        setValue(`metadataFields.${index}.fieldType`, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              ))}
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
            <Button type="submit" disabled={isSubmitting || loadingDropdowns}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
