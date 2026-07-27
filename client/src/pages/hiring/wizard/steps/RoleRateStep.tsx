import { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import type {
  CreateEndorsementWithBonusesDTO,
  CreateEndorsementBonusInput,
  EndorsementWithDetailsDTO,
} from '@shared/dto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { EndorsementTierBandComboBox } from '@/pages/endorsements/components/EndorsementTierBandComboBox';
import { EndorsementPositionComboBox } from '@/pages/endorsements/components/EndorsementPositionComboBox';
import { EndorsementSkillComboBox } from '@/pages/endorsements/components/EndorsementSkillComboBox';
import { EndorsementGroupComboBox } from '@/pages/endorsements/components/EndorsementGroupComboBox';
import { EndorsementCurrencyComboBox } from '@/pages/endorsements/components/EndorsementCurrencyComboBox';
import { useDerivedJobProfile } from '@/pages/endorsements/components/useDerivedJobProfile';
import { BonusSubcategoryComboBox } from '@/pages/endorsements/components/BonusSubcategoryComboBox';
import { BonusMetadataFields } from '@/pages/endorsements/components/BonusMetadataFields';
import { BonusSummaryTable } from '@/pages/endorsements/components/BonusSummaryTable';
import { useBonusSubcategories } from '@/pages/endorsements/components/useBonusSubcategories';
import type { SelectedBonus } from '@/pages/endorsements/components/types';
import type { WizardFormReturn } from '../types';

const STEP_1_FIELD_NAMES = new Set([
  'candidateFirstName',
  'candidateLastName',
  'clientId',
  'projectId',
  'clientManagerEmail',
  'countryId',
  'startDate',
]);

interface RoleRateStepProps {
  form: WizardFormReturn;
  onBack: () => void;
  onSubmitted: (endorsementId: number) => void;
  /** True once the endorsement already exists — role/rate are locked, this step is review-only. */
  readOnly?: boolean;
  /** The persisted endorsement, used only in readOnly mode to hydrate the bonus summary for review. */
  endorsement?: EndorsementWithDetailsDTO | null;
}

export function RoleRateStep({ form, onBack, onSubmitted, readOnly = false, endorsement = null }: RoleRateStepProps) {
  const { toast } = useToast();
  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const posIdValue = watch('posId');
  const tibIdValue = watch('tibId');
  const sklIdValue = watch('sklId');
  const grpIdValue = watch('grpId');
  const billingRateCurrencyValue = watch('billingRateCurrency');
  const countryIdValue = watch('countryId');
  const startDateValue = watch('startDate');

  const { jobProfile } = useDerivedJobProfile(
    posIdValue ? Number(posIdValue) : null,
    tibIdValue ? Number(tibIdValue) : null,
    sklIdValue ? Number(sklIdValue) : null,
    grpIdValue ? Number(grpIdValue) : null,
  );

  const numericCountryId = countryIdValue ? Number(countryIdValue) : null;

  // Bonus subcategories for the selected country (used for lookups in handlers)
  const { subcategories } = useBonusSubcategories(numericCountryId);

  // --- Bonus state (local — persisted across step navigation via the stepper's forceMount) ---
  const [selectedBonuses, setSelectedBonuses] = useState<SelectedBonus[]>([]);
  const [currentBonusSelection, setCurrentBonusSelection] = useState<number | null>(null);
  const [currentBonusAmount, setCurrentBonusAmount] = useState<number | null>(null);
  const [currentBonusComments, setCurrentBonusComments] = useState<string>('');
  const [currentBonusMetadata, setCurrentBonusMetadata] = useState<Record<string, unknown>>({});

  // Reset all bonus state when country changes
  useEffect(() => {
    if (readOnly) return;
    setSelectedBonuses([]);
    setCurrentBonusSelection(null);
    setCurrentBonusAmount(null);
    setCurrentBonusComments('');
    setCurrentBonusMetadata({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIdValue]);

  // Reviewing an already-submitted endorsement (readOnly): hydrate the summary table from the
  // bonuses actually persisted on the endorsement, reconstructed into the same SelectedBonus shape
  // handleAddBonus builds. Waits for `subcategories` to load so bonusCategoryName/metadataSchema
  // can be resolved the same way the create-mode flow resolves them.
  useEffect(() => {
    if (!readOnly) return;

    const bonuses = endorsement?.endorsementBonuses;
    if (!bonuses || bonuses.length === 0) {
      setSelectedBonuses([]);
      return;
    }
    if (subcategories.length === 0) return;

    const reconstructed: SelectedBonus[] = bonuses
      .filter((b): b is typeof b & { bonusSubcategoryId: number } => b.bonusSubcategoryId != null)
      .map((b) => {
        const subcategory = subcategories.find((s) => s.bonusSubcategoryId === b.bonusSubcategoryId);
        return {
          bonusSubcategoryId: b.bonusSubcategoryId,
          bonusSubcategoryName: b.bonusSubcategory?.bonusSubcategoryName ?? subcategory?.bonusSubcategoryName ?? '',
          bonusCategoryName:
            b.bonusSubcategory?.bonusCategory?.bonusCategoryName ?? subcategory?.bonusCategory?.bonusCategoryName ?? '',
          // Prisma Decimal serialises as a string over JSON; coerce to number explicitly (same as handleAddBonus)
          endorsementBonusAmount: b.endorsementBonusAmount != null ? Number(b.endorsementBonusAmount) : null,
          endorsementBonusComments: b.endorsementBonusComments ?? '',
          endorsementBonusMetadata: (b.endorsementBonusMetadata as Record<string, unknown>) ?? {},
          metadataSchema: subcategory?.bonusSubcategoryMetadata ?? {},
        };
      });

    setSelectedBonuses(reconstructed);
  }, [readOnly, endorsement, subcategories]);

  // --- Bonus handlers ---
  function handleBonusSelectionChange(bonusSubcategoryId: number | null) {
    setCurrentBonusSelection(bonusSubcategoryId);

    if (bonusSubcategoryId === null) {
      setCurrentBonusAmount(null);
      setCurrentBonusMetadata({});
      return;
    }

    const subcategory = subcategories.find((s) => s.bonusSubcategoryId === bonusSubcategoryId);
    if (!subcategory) return;

    // Prisma Decimal serialises as a string over JSON; coerce to number explicitly
    setCurrentBonusAmount(
      subcategory.bonusSubcategoryDefaultAmount != null ? Number(subcategory.bonusSubcategoryDefaultAmount) : null,
    );

    // Pre-fill only explicit start_date fields; end_date is handled reactively in BonusMetadataFields
    const initialMetadata: Record<string, unknown> = {};
    if (subcategory.bonusSubcategoryMetadata && startDateValue) {
      for (const [fieldName, fieldType] of Object.entries(subcategory.bonusSubcategoryMetadata)) {
        if (fieldType === 'date' && fieldName.toLowerCase().includes('start_date')) {
          initialMetadata[fieldName] = startDateValue;
        }
      }
    }
    setCurrentBonusMetadata(initialMetadata);
  }

  function handleAddBonus() {
    if (currentBonusSelection === null) return;

    const subcategory = subcategories.find((s) => s.bonusSubcategoryId === currentBonusSelection);
    if (!subcategory) return;

    const newBonus: SelectedBonus = {
      bonusSubcategoryId: subcategory.bonusSubcategoryId,
      bonusSubcategoryName: subcategory.bonusSubcategoryName,
      bonusCategoryName: subcategory.bonusCategory?.bonusCategoryName ?? '',
      endorsementBonusAmount: currentBonusAmount,
      endorsementBonusComments: currentBonusComments,
      endorsementBonusMetadata: currentBonusMetadata,
      metadataSchema: subcategory.bonusSubcategoryMetadata ?? {},
    };

    setSelectedBonuses((prev) => [...prev, newBonus]);
    setCurrentBonusSelection(null);
    setCurrentBonusAmount(null);
    setCurrentBonusComments('');
    setCurrentBonusMetadata({});
  }

  function handleRemoveBonus(bonusSubcategoryId: number) {
    setSelectedBonuses((prev) => prev.filter((b) => b.bonusSubcategoryId !== bonusSubcategoryId));
  }

  const selectedBonusIds = selectedBonuses.map((b) => b.bonusSubcategoryId);

  const currentSubcategory =
    currentBonusSelection !== null
      ? subcategories.find((s) => s.bonusSubcategoryId === currentBonusSelection)
      : undefined;

  // --- Submit ---
  const onSubmit = form.handleSubmit(
    async (data) => {
      try {
        const bonusesPayload: CreateEndorsementBonusInput[] = selectedBonuses.map((b) => ({
          bonusSubcategoryId: b.bonusSubcategoryId,
          endorsementBonusAmount: b.endorsementBonusAmount != null ? Number(b.endorsementBonusAmount) : null,
          endorsementBonusComments: b.endorsementBonusComments || undefined,
          endorsementBonusMetadata: b.endorsementBonusMetadata,
        }));

        const payload: CreateEndorsementWithBonusesDTO = {
          candidateFirstName: data.candidateFirstName,
          candidateLastName: data.candidateLastName,
          posId: Number(data.posId),
          projectId: Number(data.projectId),
          clientManagerEmail: data.clientManagerEmail,
          tibId: data.tibId ? Number(data.tibId) : null,
          billingRate: data.billingRate ? Number(data.billingRate) : null,
          billingRateCurrency: data.billingRateCurrency || null,
          countryId: Number(data.countryId),
          startDate: data.startDate,
          sklId: data.sklId ? Number(data.sklId) : null,
          grpId: data.grpId ? Number(data.grpId) : null,
          comment: data.comment || null,
          bonuses: bonusesPayload,
        };

        const created = await apiPost<EndorsementWithDetailsDTO, CreateEndorsementWithBonusesDTO>(
          '/api/endorsements',
          payload,
        );

        toast({ title: 'Success', description: 'Endorsement submitted for approval' });
        onSubmitted(created.endorsementId);
      } catch (error: any) {
        const message = error?.message || 'Failed to create endorsement';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    },
    (formErrors) => {
      // A Step 1 field failed validation — jump back so the user can see it.
      if (Object.keys(formErrors).some((field) => STEP_1_FIELD_NAMES.has(field))) {
        onBack();
      }
    },
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position */}
        <div className="space-y-2">
          <Label>
            Position <span className="text-destructive">*</span>
          </Label>
          <EndorsementPositionComboBox
            value={posIdValue}
            onValueChange={(value) => setValue('posId', value, { shouldValidate: true })}
            disabled={readOnly}
          />
          {errors.posId && <p className="text-sm text-destructive">{errors.posId.message}</p>}
          <input type="hidden" {...register('posId', { required: 'Position is required' })} />
        </div>

        {/* Tier/Band */}
        <div className="space-y-2">
          <Label>Tier/Band</Label>
          <EndorsementTierBandComboBox
            value={tibIdValue}
            onValueChange={(value) => setValue('tibId', value, { shouldValidate: true })}
            disabled={readOnly}
          />
          {errors.tibId && <p className="text-sm text-destructive">{errors.tibId.message}</p>}
          {/* TEMP DEMO: optional until the Job Profile mapping catalog (TASK-001) is loaded — restore `required` after that */}
          <input type="hidden" {...register('tibId')} />
        </div>

        {/* Skill */}
        <div className="space-y-2">
          <Label>Skill</Label>
          <EndorsementSkillComboBox
            value={sklIdValue}
            onValueChange={(value) => setValue('sklId', value)}
            disabled={readOnly}
          />
        </div>

        {/* Group */}
        <div className="space-y-2">
          <Label>Group</Label>
          <EndorsementGroupComboBox
            value={grpIdValue}
            onValueChange={(value) => setValue('grpId', value)}
            disabled={readOnly}
          />
        </div>

        {/* Billing Rate Currency */}
        <div className="space-y-2">
          <Label>Billing Rate Currency</Label>
          <EndorsementCurrencyComboBox
            value={billingRateCurrencyValue}
            onValueChange={(value) => setValue('billingRateCurrency', value)}
            disabled={readOnly}
          />
        </div>

        {/* Billing Rate Amount */}
        <div className="space-y-2">
          <Label htmlFor="billingRate">Billing Rate Amount</Label>
          <Input
            id="billingRate"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 50.00"
            disabled={readOnly}
            {...register('billingRate')}
          />
        </div>

        {/* Job Profile — derived, read-only, full width */}
        <div className="space-y-2 md:col-span-2">
          <Label>Job Profile</Label>
          <Input
            readOnly
            disabled
            value={jobProfile?.jobProfileName ?? ''}
            placeholder="Select position, tier/band, skill, and group to derive the job profile"
          />
        </div>
      </div>

      {/* Comment - full width */}
      <div className="space-y-2">
        <Label htmlFor="comment">Comment</Label>
        <Textarea id="comment" rows={3} placeholder="Optional notes or comments..." disabled={readOnly} {...register('comment')} />
      </div>

      {/* ── Bonus Selection ── */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Bonus Selection</h3>

        {numericCountryId === null ? (
          <p className="text-sm text-muted-foreground">Select a country in Step 1 first to add bonuses.</p>
        ) : readOnly ? (
          <p className="text-sm text-muted-foreground">Bonuses are locked once the endorsement has been submitted.</p>
        ) : (
          <>
            {/* Row 1: Bonus selector + Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bonus</Label>
                <BonusSubcategoryComboBox
                  countryId={numericCountryId}
                  selectedBonusIds={selectedBonusIds}
                  value={currentBonusSelection}
                  onValueChange={handleBonusSelectionChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonusAmount">Amount</Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150.00"
                  value={currentBonusAmount ?? ''}
                  onChange={(e) => setCurrentBonusAmount(e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>

            {/* Row 2: Dynamic metadata fields */}
            {currentSubcategory && Object.keys(currentSubcategory.bonusSubcategoryMetadata ?? {}).length > 0 && (
              <BonusMetadataFields
                metadataSchema={currentSubcategory.bonusSubcategoryMetadata}
                metadataValues={currentBonusMetadata}
                onMetadataChange={(key, value) => setCurrentBonusMetadata((prev) => ({ ...prev, [key]: value }))}
                endorsementStartDate={startDateValue || undefined}
              />
            )}

            {/* Row 3: Comments + Add button */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bonusComments">Comments</Label>
                <Input
                  id="bonusComments"
                  placeholder="Optional bonus comments..."
                  value={currentBonusComments}
                  onChange={(e) => setCurrentBonusComments(e.target.value)}
                />
              </div>
              <Button type="button" onClick={handleAddBonus} disabled={currentBonusSelection === null}>
                <Plus size={16} className="me-1" />
                Add Bonus
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Selected bonuses table */}
      <BonusSummaryTable bonuses={selectedBonuses} onRemove={handleRemoveBonus} />

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft size={16} className="me-1" />
          Back
        </Button>
        {!readOnly && (
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        )}
      </div>
    </div>
  );
}
