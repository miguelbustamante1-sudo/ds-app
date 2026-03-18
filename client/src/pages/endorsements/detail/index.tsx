import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CheckCircle, Plus } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiPut, apiPatch, apiPost, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { useEndorsementDetail } from './useEndorsementDetail';
import { useBonusSubcategories } from '../components/useBonusSubcategories';
import { EndorsementProjectComboBox } from '../components/EndorsementProjectComboBox';
import { EndorsementTierBandComboBox } from '../components/EndorsementTierBandComboBox';
import { EndorsementClientManagerEmailField } from '../components/EndorsementClientManagerEmailField';
import { BonusSubcategoryComboBox } from '../components/BonusSubcategoryComboBox';
import { BonusMetadataFields } from '../components/BonusMetadataFields';
import { BonusDetailTable } from './BonusDetailTable';
import type {
  UpdateEndorsementDTO,
  UpdateEndorsementStatusDTO,
  EndorsementWithDetailsDTO,
  CreateEndorsementBonusDTO,
} from '@shared/dto';

// ── Types ────────────────────────────────────────────────────────────────────

interface EndorsementFormData {
  candidateFirstName: string;
  candidateLastName: string;
  candidatePosition: string;
  clientManagerEmail: string;
  projectId: string;
  startDate: string;
  tibId: string;
  billingRate: string;
  comment: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: ComboBoxOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

// ── StatusDropdown ────────────────────────────────────────────────────────────

interface StatusDropdownProps {
  currentStatus: string;
  endorsementId: number;
  onSuccess: () => void;
}

function StatusDropdown({ currentStatus, endorsementId, onSuccess }: StatusDropdownProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleChange = async (newStatus: string) => {
    if (!newStatus || newStatus === currentStatus) return;
    try {
      setSaving(true);
      await apiPatch<void, UpdateEndorsementStatusDTO>(
        `/api/endorsements/${endorsementId}/status`,
        { status: newStatus },
      );
      toast({ title: 'Status updated', description: `Status changed to ${newStatus}` });
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComboBox
      options={STATUS_OPTIONS}
      value={currentStatus}
      onValueChange={handleChange}
      placeholder="Select status"
      searchPlaceholder="Search status..."
      emptyMessage="No status found."
      disabled={saving}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EndorsementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const endorsementId = id ? parseInt(id, 10) : NaN;

  const { endorsement, bonuses, loading, error, load, reload } = useEndorsementDetail();
  const { subcategories } = useBonusSubcategories(endorsement?.countryId ?? null);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // ── Approve state ────────────────────────────────────────────────────────────
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [approving, setApproving] = useState(false);

  // ── Add Bonus state ─────────────────────────────────────────────────────────
  const [currentBonusSelection, setCurrentBonusSelection] = useState<number | null>(null);
  const [currentBonusAmount, setCurrentBonusAmount] = useState<number | null>(null);
  const [currentBonusComments, setCurrentBonusComments] = useState('');
  const [currentBonusMetadata, setCurrentBonusMetadata] = useState<Record<string, unknown>>({});
  const [addingBonus, setAddingBonus] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EndorsementFormData>({
    defaultValues: {
      candidateFirstName: '',
      candidateLastName: '',
      candidatePosition: '',
      clientManagerEmail: '',
      projectId: '',
      startDate: '',
      tibId: '',
      billingRate: '',
      comment: '',
    },
  });

  const projectIdValue = watch('projectId');
  const tibIdValue = watch('tibId');

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNaN(endorsementId)) {
      load(endorsementId);
    }
  }, [endorsementId]);

  // ── Populate form when data arrives ─────────────────────────────────────────
  useEffect(() => {
    if (endorsement) {
      reset({
        candidateFirstName: endorsement.candidateFirstName,
        candidateLastName: endorsement.candidateLastName,
        candidatePosition: endorsement.candidatePosition,
        clientManagerEmail: endorsement.clientManagerEmail,
        projectId: String(endorsement.projectId),
        startDate: endorsement.startDate
          ? String(endorsement.startDate).slice(0, 10)
          : '',
        tibId: endorsement.tibId != null ? String(endorsement.tibId) : '',
        billingRate: endorsement.billingRate != null ? String(endorsement.billingRate) : '',
        comment: endorsement.comment ?? '',
      });
    }
  }, [endorsement, reset]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const onSave = async (data: EndorsementFormData) => {
    try {
      const payload: UpdateEndorsementDTO = {
        candidateFirstName: data.candidateFirstName,
        candidateLastName: data.candidateLastName,
        candidatePosition: data.candidatePosition,
        clientManagerEmail: data.clientManagerEmail,
        projectId: Number(data.projectId),
        startDate: data.startDate,
        tibId: data.tibId ? Number(data.tibId) : null,
        billingRate: data.billingRate ? Number(data.billingRate) : null,
        comment: data.comment || null,
        // countryId deliberately omitted — country is immutable after creation
      };

      await apiPut<EndorsementWithDetailsDTO, UpdateEndorsementDTO>(
        `/api/endorsements/${endorsementId}`,
        payload,
      );

      toast({ title: 'Success', description: 'Endorsement updated successfully' });
      setIsEditing(false);
      reload(endorsementId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save endorsement';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      // Stay in edit mode so the user can correct and retry
    }
  };

  // ── Approve handler ──────────────────────────────────────────────────────────
  const handleApprove = async () => {
    try {
      setApproving(true);
      await apiPatch<void, UpdateEndorsementStatusDTO>(
        `/api/endorsements/${endorsementId}/status`,
        { status: 'Approved', comment: approveComment },
      );
      toast({ title: 'Approved', description: 'Endorsement has been approved.' });
      setApproveDialogOpen(false);
      setApproveComment('');
      reload(endorsementId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to approve endorsement';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  // ── Bonus handlers ───────────────────────────────────────────────────────────
  const handleBonusSelectionChange = (bonusSubcategoryId: number | null) => {
    setCurrentBonusSelection(bonusSubcategoryId);

    if (bonusSubcategoryId === null) {
      setCurrentBonusAmount(null);
      setCurrentBonusMetadata({});
      return;
    }

    const subcategory = subcategories.find((s) => s.bonusSubcategoryId === bonusSubcategoryId);
    if (!subcategory) return;

    setCurrentBonusAmount(
      subcategory.bonusSubcategoryDefaultAmount != null
        ? Number(subcategory.bonusSubcategoryDefaultAmount)
        : null,
    );

    const startDateValue = endorsement?.startDate
      ? String(endorsement.startDate).slice(0, 10)
      : '';
    const initialMetadata: Record<string, unknown> = {};
    if (subcategory.bonusSubcategoryMetadata && startDateValue) {
      for (const [fieldName, fieldType] of Object.entries(subcategory.bonusSubcategoryMetadata)) {
        if (fieldType === 'date' && fieldName.toLowerCase().includes('start_date')) {
          initialMetadata[fieldName] = startDateValue;
        }
      }
    }
    setCurrentBonusMetadata(initialMetadata);
  };

  const handleAddBonus = async () => {
    if (currentBonusSelection === null) return;
    try {
      setAddingBonus(true);
      const payload: CreateEndorsementBonusDTO = {
        endorsementId: endorsementId,
        bonusSubcategoryId: currentBonusSelection,
        endorsementBonusAmount: currentBonusAmount,
        endorsementBonusMetadata: currentBonusMetadata,
        endorsementBonusComments: currentBonusComments || null,
      };
      await apiPost<void, CreateEndorsementBonusDTO>('/api/endorsement-bonuses', payload);
      setCurrentBonusSelection(null);
      setCurrentBonusAmount(null);
      setCurrentBonusComments('');
      setCurrentBonusMetadata({});
      reload(endorsementId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add bonus';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setAddingBonus(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedBonusIds = bonuses
    .map((b) => b.bonusSubcategoryId)
    .filter((id): id is number => id !== null);

  const currentSubcategory = subcategories.find(
    (s) => s.bonusSubcategoryId === currentBonusSelection,
  );

  const endorsementStartDate = endorsement?.startDate
    ? String(endorsement.startDate).slice(0, 10)
    : '';

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading && !endorsement) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────────
  if (error === 404) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Endorsement Not Found</ToolbarPageTitle>
            <ToolbarDescription>
              The endorsement you're looking for doesn't exist.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={() => navigate('/endorsements')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // ── Generic error ─────────────────────────────────────────────────────────────
  if (error && !endorsement) {
    return (
      <div className="container">
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle>Something went wrong</ToolbarPageTitle>
            <ToolbarDescription>
              There was an error loading this endorsement.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
        <div className="mt-6">
          <Button onClick={() => navigate('/endorsements')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!endorsement) return null;

  return (
    <div className="container">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/endorsements')} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{`Endorsement #${endorsement.endorsementId} — ${endorsement.candidateFirstName} ${endorsement.candidateLastName}`}</ToolbarPageTitle>
              <ToolbarDescription>{endorsement.candidatePosition}</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
        <ToolbarActions>
          <StatusDropdown
            currentStatus={endorsement.status}
            endorsementId={endorsementId}
            onSuccess={() => reload(endorsementId)}
          />
          {endorsement.status === 'Pending' && !isEditing && (
            <Button onClick={() => setApproveDialogOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSave)} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </ToolbarActions>
      </Toolbar>

      {/* General Information Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">

            {/* First Name */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="candidateFirstName">First Name <span className="text-destructive">*</span></Label>}
                {!isEditing && 'First Name'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <Input
                      id="candidateFirstName"
                      {...register('candidateFirstName', { required: 'First name is required' })}
                    />
                    {errors.candidateFirstName && (
                      <p className="text-sm text-destructive mt-1">{errors.candidateFirstName.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.candidateFirstName
                )}
              </dd>
            </div>

            {/* Last Name */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="candidateLastName">Last Name <span className="text-destructive">*</span></Label>}
                {!isEditing && 'Last Name'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <Input
                      id="candidateLastName"
                      {...register('candidateLastName', { required: 'Last name is required' })}
                    />
                    {errors.candidateLastName && (
                      <p className="text-sm text-destructive mt-1">{errors.candidateLastName.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.candidateLastName
                )}
              </dd>
            </div>

            {/* Position */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="candidatePosition">Position <span className="text-destructive">*</span></Label>}
                {!isEditing && 'Position'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <Input
                      id="candidatePosition"
                      {...register('candidatePosition', { required: 'Position is required' })}
                    />
                    {errors.candidatePosition && (
                      <p className="text-sm text-destructive mt-1">{errors.candidatePosition.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.candidatePosition
                )}
              </dd>
            </div>

            {/* Email */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="clientManagerEmail">Email <span className="text-destructive">*</span></Label>}
                {!isEditing && 'Email'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <EndorsementClientManagerEmailField
                      value={watch('clientManagerEmail')}
                      onChange={(val) => setValue('clientManagerEmail', val, { shouldValidate: true })}
                      clientId={endorsement.project?.clientId?.toString()}
                      inputProps={{
                        id: 'clientManagerEmail',
                        ...register('clientManagerEmail', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid email format',
                          },
                        }),
                      }}
                    />
                    {errors.clientManagerEmail && (
                      <p className="text-sm text-destructive mt-1">{errors.clientManagerEmail.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.clientManagerEmail
                )}
              </dd>
            </div>

            {/* Project */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label>Project <span className="text-destructive">*</span></Label>}
                {!isEditing && 'Project'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <EndorsementProjectComboBox
                      value={projectIdValue}
                      onValueChange={(value) => setValue('projectId', value, { shouldValidate: true })}
                    />
                    <input type="hidden" {...register('projectId', { required: 'Project is required' })} />
                    {errors.projectId && (
                      <p className="text-sm text-destructive mt-1">{errors.projectId.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.project?.projectName ?? '—'
                )}
              </dd>
            </div>

            {/* Country — always static, never editable */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Country</dt>
              <dd className="text-sm mt-1">{endorsement.country?.countryName ?? '—'}</dd>
            </div>

            {/* Start Date */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>}
                {!isEditing && 'Start Date'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <>
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate', { required: 'Start date is required' })}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
                    )}
                  </>
                ) : (
                  endorsement.startDate ? formatUTCDate(endorsement.startDate) : '—'
                )}
              </dd>
            </div>

            {/* Tier/Band */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label>Tier/Band</Label>}
                {!isEditing && 'Tier/Band'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <EndorsementTierBandComboBox
                    value={tibIdValue}
                    onValueChange={(value) => setValue('tibId', value)}
                  />
                ) : (
                  endorsement.tierBand?.tierBandDescription ?? '—'
                )}
              </dd>
            </div>

            {/* Billing Rate */}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="billingRate">Billing Rate</Label>}
                {!isEditing && 'Billing Rate'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <Input
                    id="billingRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 50.00"
                    {...register('billingRate')}
                  />
                ) : (
                  endorsement.billingRate != null
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(endorsement.billingRate)
                    : '—'
                )}
              </dd>
            </div>

            {/* Comment — full width */}
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">
                {isEditing && <Label htmlFor="comment">Comment</Label>}
                {!isEditing && 'Comment'}
              </dt>
              <dd className="text-sm mt-1">
                {isEditing ? (
                  <Textarea
                    id="comment"
                    rows={3}
                    placeholder="Optional notes or comments..."
                    {...register('comment')}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{endorsement.comment ?? '—'}</span>
                )}
              </dd>
            </div>

          </dl>
        </CardContent>
      </Card>

      {/* Bonuses Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bonuses</CardTitle>
        </CardHeader>
        <CardContent>
          <BonusDetailTable
            bonuses={bonuses}
            subcategories={subcategories}
            isEditing={isEditing}
            onDeleted={() => reload(endorsementId)}
            onSaved={() => reload(endorsementId)}
            endorsementStartDate={endorsementStartDate}
          />

          {/* Add Bonus Panel */}
          {isEditing && (
            <div className="rounded-lg border bg-card p-6 space-y-4 mt-4">
              <h3 className="text-base font-semibold">Add Bonus</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <BonusSubcategoryComboBox
                    countryId={endorsement.countryId}
                    selectedBonusIds={selectedBonusIds}
                    value={currentBonusSelection}
                    onValueChange={handleBonusSelectionChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentBonusAmount ?? ''}
                    onChange={(e) =>
                      setCurrentBonusAmount(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </div>
              </div>

              {currentSubcategory &&
                Object.keys(currentSubcategory.bonusSubcategoryMetadata ?? {}).length > 0 && (
                  <BonusMetadataFields
                    metadataSchema={currentSubcategory.bonusSubcategoryMetadata}
                    metadataValues={currentBonusMetadata}
                    onMetadataChange={(key, value) =>
                      setCurrentBonusMetadata((prev) => ({ ...prev, [key]: value }))
                    }
                    endorsementStartDate={endorsementStartDate || undefined}
                  />
                )}

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Comments</Label>
                  <Input
                    placeholder="Optional bonus comments..."
                    value={currentBonusComments}
                    onChange={(e) => setCurrentBonusComments(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddBonus}
                  disabled={currentBonusSelection === null || addingBonus}
                >
                  <Plus size={16} className="me-1" />
                  {addingBonus ? 'Adding...' : 'Add Bonus'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={(open) => { setApproveDialogOpen(open); if (!open) setApproveComment(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Endorsement</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="approveComment">Approval Comment</Label>
            <Textarea
              id="approveComment"
              className="mt-2"
              rows={4}
              placeholder="Enter an approval comment..."
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialogOpen(false); setApproveComment(''); }} disabled={approving}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving || !approveComment.trim()}>
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
