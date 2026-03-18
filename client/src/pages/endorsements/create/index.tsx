import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import type {
  CreateEndorsementWithBonusesDTO,
  CreateEndorsementBonusInput,
  EndorsementWithDetailsDTO,
} from '@shared/dto';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { EndorsementClientComboBox } from '../components/EndorsementClientComboBox';
import { EndorsementProjectComboBox } from '../components/EndorsementProjectComboBox';
import { EndorsementClientManagerEmailField } from '../components/EndorsementClientManagerEmailField';
import { EndorsementCountryComboBox } from '../components/EndorsementCountryComboBox';
import { EndorsementTierBandComboBox } from '../components/EndorsementTierBandComboBox';
import { BonusSubcategoryComboBox } from '../components/BonusSubcategoryComboBox';
import { BonusMetadataFields } from '../components/BonusMetadataFields';
import { BonusSummaryTable } from '../components/BonusSummaryTable';
import { useBonusSubcategories } from '../components/useBonusSubcategories';
import type { SelectedBonus } from '../components/types';

interface EndorsementFormData {
  candidateFirstName: string;
  candidateLastName: string;
  candidatePosition: string;
  clientId: string;
  projectId: string;
  clientManagerEmail: string;
  tibId: string;
  billingRate: string;
  countryId: string;
  startDate: string;
  comment: string;
}

export function EndorsementCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EndorsementFormData>({
    defaultValues: {
      candidateFirstName: '',
      candidateLastName: '',
      candidatePosition: '',
      clientId: '',
      projectId: '',
      clientManagerEmail: '',
      tibId: '',
      billingRate: '',
      countryId: '',
      startDate: new Date().toISOString().split('T')[0],
      comment: '',
    },
  });

  const clientIdValue = watch('clientId');
  const projectIdValue = watch('projectId');
  const countryIdValue = watch('countryId');
  const tibIdValue = watch('tibId');
  const startDateValue = watch('startDate');

  // Reset project when client changes
  useEffect(() => {
    setValue('projectId', '', { shouldValidate: false });
  }, [clientIdValue, setValue]);

  const numericCountryId = countryIdValue ? Number(countryIdValue) : null;

  // Bonus subcategories for the selected country (used for lookups in handlers)
  const { subcategories } = useBonusSubcategories(numericCountryId);

  // --- Bonus state ---
  const [selectedBonuses, setSelectedBonuses] = useState<SelectedBonus[]>([]);
  const [currentBonusSelection, setCurrentBonusSelection] = useState<number | null>(null);
  const [currentBonusAmount, setCurrentBonusAmount] = useState<number | null>(null);
  const [currentBonusComments, setCurrentBonusComments] = useState<string>('');
  const [currentBonusMetadata, setCurrentBonusMetadata] = useState<Record<string, unknown>>({});

  // Reset all bonus state when country changes
  useEffect(() => {
    setSelectedBonuses([]);
    setCurrentBonusSelection(null);
    setCurrentBonusAmount(null);
    setCurrentBonusComments('');
    setCurrentBonusMetadata({});
  }, [countryIdValue]);

  // --- Bonus handlers ---
  function handleBonusSelectionChange(bonusSubcategoryId: number | null) {
    setCurrentBonusSelection(bonusSubcategoryId);

    if (bonusSubcategoryId === null) {
      setCurrentBonusAmount(null);
      setCurrentBonusMetadata({});
      return;
    }

    const subcategory = subcategories.find(
      (s) => s.bonusSubcategoryId === bonusSubcategoryId,
    );
    if (!subcategory) return;

    // Prisma Decimal serialises as a string over JSON; coerce to number explicitly
    setCurrentBonusAmount(
      subcategory.bonusSubcategoryDefaultAmount != null
        ? Number(subcategory.bonusSubcategoryDefaultAmount)
        : null,
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

    const subcategory = subcategories.find(
      (s) => s.bonusSubcategoryId === currentBonusSelection,
    );
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
    setSelectedBonuses((prev) =>
      prev.filter((b) => b.bonusSubcategoryId !== bonusSubcategoryId),
    );
  }

  const selectedBonusIds = selectedBonuses.map((b) => b.bonusSubcategoryId);

  const currentSubcategory =
    currentBonusSelection !== null
      ? subcategories.find((s) => s.bonusSubcategoryId === currentBonusSelection)
      : undefined;

  // --- Submit ---
  const onSubmit = async (data: EndorsementFormData) => {
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
        candidatePosition: data.candidatePosition,
        projectId: Number(data.projectId),
        clientManagerEmail: data.clientManagerEmail,
        tibId: data.tibId ? Number(data.tibId) : null,
        billingRate: data.billingRate ? Number(data.billingRate) : null,
        countryId: Number(data.countryId),
        startDate: data.startDate,
        comment: data.comment || null,
        bonuses: bonusesPayload,
      };

      await apiPost<EndorsementWithDetailsDTO, CreateEndorsementWithBonusesDTO>(
        '/api/endorsements',
        payload,
      );

      toast({ title: 'Success', description: 'Endorsement created successfully' });
      navigate('/endorsements');
    } catch (error: any) {
      const message = error?.message || 'Failed to create endorsement';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>New Endorsement</ToolbarPageTitle>
          <ToolbarDescription>Fill in the details to create a new endorsement</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/endorsements')}>
            <ArrowLeft size={16} className="me-1" />
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-4xl space-y-8">

        {/* ── Section A: General Information ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate First Name */}
          <div className="space-y-2">
            <Label htmlFor="candidateFirstName">
              Candidate First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="candidateFirstName"
              {...register('candidateFirstName', { required: 'Candidate first name is required' })}
            />
            {errors.candidateFirstName && (
              <p className="text-sm text-destructive">{errors.candidateFirstName.message}</p>
            )}
          </div>

          {/* Candidate Last Name */}
          <div className="space-y-2">
            <Label htmlFor="candidateLastName">
              Candidate Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="candidateLastName"
              {...register('candidateLastName', { required: 'Candidate last name is required' })}
            />
            {errors.candidateLastName && (
              <p className="text-sm text-destructive">{errors.candidateLastName.message}</p>
            )}
          </div>

          {/* Candidate Position */}
          <div className="space-y-2">
            <Label htmlFor="candidatePosition">
              Candidate Position <span className="text-destructive">*</span>
            </Label>
            <Input
              id="candidatePosition"
              {...register('candidatePosition', { required: 'Candidate position is required' })}
            />
            {errors.candidatePosition && (
              <p className="text-sm text-destructive">{errors.candidatePosition.message}</p>
            )}
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            <EndorsementClientComboBox
              value={clientIdValue}
              onValueChange={(value) => setValue('clientId', value, { shouldValidate: true })}
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>
              Project <span className="text-destructive">*</span>
            </Label>
            <EndorsementProjectComboBox
              value={projectIdValue}
              clientId={clientIdValue}
              onValueChange={(value) => setValue('projectId', value, { shouldValidate: true })}
            />
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
            <input
              type="hidden"
              {...register('projectId', { required: 'Project is required' })}
            />
          </div>

          {/* Client Manager Email */}
          <div className="space-y-2">
            <Label htmlFor="clientManagerEmail">
              Client Manager Email <span className="text-destructive">*</span>
            </Label>
            <EndorsementClientManagerEmailField
              value={watch('clientManagerEmail')}
              onChange={(val) => setValue('clientManagerEmail', val, { shouldValidate: true })}
              clientId={clientIdValue}
              inputProps={{
                id: 'clientManagerEmail',
                ...register('clientManagerEmail', {
                  required: 'Client manager email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format',
                  },
                }),
              }}
            />
            {errors.clientManagerEmail && (
              <p className="text-sm text-destructive">{errors.clientManagerEmail.message}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label>
              Country <span className="text-destructive">*</span>
            </Label>
            <EndorsementCountryComboBox
              value={countryIdValue}
              onValueChange={(value) => setValue('countryId', value, { shouldValidate: true })}
            />
            {errors.countryId && (
              <p className="text-sm text-destructive">{errors.countryId.message}</p>
            )}
            <input
              type="hidden"
              {...register('countryId', { required: 'Country is required' })}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          {/* Tier/Band */}
          <div className="space-y-2">
            <Label>Tier/Band</Label>
            <EndorsementTierBandComboBox
              value={tibIdValue}
              onValueChange={(value) => setValue('tibId', value)}
            />
          </div>

          {/* Billing Rate */}
          <div className="space-y-2">
            <Label htmlFor="billingRate">Billing Rate</Label>
            <Input
              id="billingRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 50.00"
              {...register('billingRate')}
            />
          </div>
        </div>

        {/* Comment - full width */}
        <div className="space-y-2">
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            rows={3}
            placeholder="Optional notes or comments..."
            {...register('comment')}
          />
        </div>

        {/* ── Section B: Bonus Selection ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Bonus Selection</h3>

          {numericCountryId === null ? (
            <p className="text-sm text-muted-foreground">Select a country first to add bonuses.</p>
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
                    onChange={(e) =>
                      setCurrentBonusAmount(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </div>
              </div>

              {/* Row 2: Dynamic metadata fields */}
              {currentSubcategory &&
                Object.keys(currentSubcategory.bonusSubcategoryMetadata ?? {}).length > 0 && (
                  <BonusMetadataFields
                    metadataSchema={currentSubcategory.bonusSubcategoryMetadata}
                    metadataValues={currentBonusMetadata}
                    onMetadataChange={(key, value) =>
                      setCurrentBonusMetadata((prev) => ({ ...prev, [key]: value }))
                    }
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
                <Button
                  type="button"
                  onClick={handleAddBonus}
                  disabled={currentBonusSelection === null}
                >
                  <Plus size={16} className="me-1" />
                  Add Bonus
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ── Section C: Selected Bonuses Table ── */}
        <BonusSummaryTable bonuses={selectedBonuses} onRemove={handleRemoveBonus} />

        {/* ── Section D: Submit ── */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/endorsements')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Endorsement'}
          </Button>
        </div>
      </form>
    </div>
  );
}
