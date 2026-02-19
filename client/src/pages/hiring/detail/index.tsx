import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUTCDate } from '@/lib/utils';
import { useHiringDetail } from './useHiringDetail';

export function HiringDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const endorsementIdParam = searchParams.get('endorsementId');
  const mode: 'draft' | 'execute' = id ? 'execute' : 'draft';

  const numericId = id ? parseInt(id, 10) : undefined;
  const numericEndorsementId = endorsementIdParam ? parseInt(endorsementIdParam, 10) : undefined;

  const {
    endorsement,
    bonusCategories,
    loading,
    submitting,
    startDate,
    billableDate,
    workdayId,
    canExecute,
    load,
    handleStartDateChange,
    handleBillableDateChange,
    setWorkdayId,
    currencySymbol,
    setCurrencySymbol,
    submitDraft,
    submitExecute,
  } = useHiringDetail(mode, numericId, numericEndorsementId);

  useEffect(() => {
    load();
  }, []);

  const candidateName = endorsement
    ? `${endorsement.candidateFirstName} ${endorsement.candidateLastName}`
    : '—';

  const pageTitle =
    mode === 'draft'
      ? `New Hiring — ${candidateName}`
      : `Hiring #${numericId} — ${candidateName}`;

  // ── Loading skeleton ────────────────────────────────────────────────────────
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

  return (
    <div className="container">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/hiring')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{pageTitle}</ToolbarPageTitle>
              <ToolbarDescription>
                {mode === 'draft' ? 'Draft a new hiring record' : 'Execute pending hiring'}
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/hiring')}>
            Cancel
          </Button>
          {mode === 'draft' ? (
            <Button
              disabled={!startDate || submitting}
              onClick={async () => {
                const ok = await submitDraft();
                if (ok) navigate('/hiring');
              }}
            >
              {submitting ? 'Saving…' : 'Draft Hiring'}
            </Button>
          ) : (
            <Button
              disabled={!canExecute || submitting}
              onClick={async () => {
                const ok = await submitExecute();
                if (ok) navigate('/hiring?tab=execute');
              }}
            >
              {submitting ? 'Saving…' : 'Execute'}
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      {/* ── Endorsement Info (read-only) ─────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Endorsement Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Candidate Name</dt>
                <dd className="text-sm mt-1">{candidateName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Position</dt>
                <dd className="text-sm mt-1">{endorsement?.candidatePosition ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Project</dt>
                <dd className="text-sm mt-1">{endorsement?.project?.projectName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                <dd className="text-sm mt-1">{endorsement?.country?.countryName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Tier Band</dt>
                <dd className="text-sm mt-1">
                  {endorsement?.tierBand?.tierBandDescription ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Billing Rate</dt>
                <dd className="text-sm mt-1">
                  {endorsement?.billingRate != null
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(endorsement.billingRate)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Manager Email</dt>
                <dd className="text-sm mt-1">{endorsement?.clientManagerEmail ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Endorsement Start Date
                </dt>
                <dd className="text-sm mt-1">
                  {endorsement?.startDate ? formatUTCDate(endorsement.startDate) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm mt-1">{endorsement?.status ?? '—'}</dd>
              </div>
              {bonusCategories.length > 0 && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Bonuses</dt>
                  <dd className="flex flex-wrap gap-x-6 gap-y-2">
                    {bonusCategories.map((cat) => {
                      const hasBonus = endorsement?.endorsementBonuses?.some(
                        (b) => b.bonusSubcategory?.bonusCategory.bonusCategoryId === cat.bonusCategoryId,
                      ) ?? false;
                      return (
                        <div key={cat.bonusCategoryId} className="flex items-center gap-2">
                          <Checkbox id={`bonus-${cat.bonusCategoryId}`} checked={hasBonus} disabled />
                          <label
                            htmlFor={`bonus-${cat.bonusCategoryId}`}
                            className="text-sm text-muted-foreground"
                          >
                            {cat.bonusCategoryName}
                          </label>
                        </div>
                      );
                    })}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* ── Editable Hiring Fields ───────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hiring Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date
                {mode === 'draft' && <span className="text-destructive ms-0.5">*</span>}
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>

            {/* Billable Date */}
            <div className="space-y-2">
              <Label htmlFor="billableDate">Billable Date</Label>
              <Input
                id="billableDate"
                type="date"
                value={billableDate}
                onChange={(e) => handleBillableDateChange(e.target.value)}
              />
            </div>

            {/* Workday ID */}
            <div className="space-y-2">
              <Label htmlFor="workdayId">
                Workday ID
                {mode === 'execute' && (
                  <span className="text-muted-foreground text-xs ms-1">(required to execute)</span>
                )}
              </Label>
              <Input
                id="workdayId"
                type="text"
                value={workdayId}
                onChange={(e) => setWorkdayId(e.target.value)}
              />
            </div>

            {/* Currency Symbol */}
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input
                id="currencySymbol"
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
