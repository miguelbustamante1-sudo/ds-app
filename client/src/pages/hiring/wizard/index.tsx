import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { useHiringWizard } from './useHiringWizard';
import { useWizardForm } from './useWizardForm';
import { WizardStepper, type WizardStepDefinition } from './WizardStepper';
import { CandidateEntryStep } from './steps/CandidateEntryStep';
import { RoleRateStep } from './steps/RoleRateStep';
import { ApprovalStep } from './steps/ApprovalStep';
import { HiringDetailsStep } from './steps/HiringDetailsStep';
import { ExecuteStep } from './steps/ExecuteStep';
import { SuccessStep } from './steps/SuccessStep';
import { stateToStepId, type ExecuteHiringResultDTO, type WizardStepId } from './types';

function PlaceholderPanel({ stepNumber, note }: { stepNumber: number; note?: string }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p>Step {stepNumber} placeholder</p>
      {note && <p className="mt-2 text-xs">{note}</p>}
    </div>
  );
}

export function WizardPage() {
  const navigate = useNavigate();
  const { endorsementId: endorsementIdParam } = useParams<{ endorsementId: string }>();
  const endorsementId = endorsementIdParam ? Number(endorsementIdParam) : undefined;

  const { currentStep, endorsement, hiring, loading, error, refetch } = useHiringWizard(endorsementId);
  const form = useWizardForm();

  // How far the user has progressed through Step 1 -> Step 2 before the endorsement exists (state S0).
  const [maxReachedStep, setMaxReachedStep] = useState<WizardStepId>(1);
  const [activeStep, setActiveStep] = useState<WizardStepId>(1);

  const unlockedStep: WizardStepId = currentStep === 'S0' ? maxReachedStep : stateToStepId(currentStep);

  // Auto-advance the visible panel whenever the unlocked step moves forward
  // (e.g. right after "Submit for Approval", or when resuming further along the flow).
  useEffect(() => {
    setActiveStep(unlockedStep);
  }, [unlockedStep]);

  // Once the endorsement is loaded, hydrate the shared form so Steps 1-2 can be reviewed read-only.
  useEffect(() => {
    if (!endorsement) return;
    form.reset({
      candidateFirstName: endorsement.candidateFirstName,
      candidateLastName: endorsement.candidateLastName,
      clientId: endorsement.project?.clientId != null ? String(endorsement.project.clientId) : '',
      posId: endorsement.posId != null ? String(endorsement.posId) : '',
      projectId: String(endorsement.projectId),
      clientManagerEmail: endorsement.clientManagerEmail,
      tibId: endorsement.tibId != null ? String(endorsement.tibId) : '',
      billingRate: endorsement.billingRate != null ? String(endorsement.billingRate) : '',
      billingRateCurrency: endorsement.billingRateCurrency ?? '',
      countryId: String(endorsement.countryId),
      startDate: typeof endorsement.startDate === 'string' ? endorsement.startDate.split('T')[0] : '',
      sklId: endorsement.sklId != null ? String(endorsement.sklId) : '',
      grpId: endorsement.grpId != null ? String(endorsement.grpId) : '',
      comment: endorsement.comment ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endorsement]);

  function handleStepChange(step: WizardStepId) {
    if (step <= unlockedStep) setActiveStep(step);
  }

  function handleStep1Next() {
    setMaxReachedStep(2);
  }

  function handleStep2Back() {
    setActiveStep(1);
  }

  function handleSubmitted(newEndorsementId: number) {
    navigate(`/hiring/wizard/${newEndorsementId}`, { replace: true });
  }

  function handleExecuted(_result: ExecuteHiringResultDTO) {
    refetch();
  }

  const isReview = currentStep !== 'S0';

  const steps: WizardStepDefinition[] = [
    {
      id: 1,
      title: 'Candidate Entry',
      content: <CandidateEntryStep form={form} onNext={handleStep1Next} readOnly={isReview} />,
      forceMount: true,
    },
    {
      id: 2,
      title: 'Role & Rate',
      content: (
        <RoleRateStep
          form={form}
          onBack={handleStep2Back}
          onSubmitted={handleSubmitted}
          readOnly={isReview}
          endorsement={endorsement}
        />
      ),
      forceMount: true,
    },
    {
      id: 3,
      title: 'Approval',
      content: endorsement ? (
        <ApprovalStep endorsement={endorsement} onStatusChange={refetch} />
      ) : (
        <PlaceholderPanel stepNumber={3} />
      ),
    },
    {
      // S3 (no hiring yet) shows the create-draft form here. Once a draft exists (S4/S5), this nav
      // item shows the same fully-editable ExecuteStep as Step 5 — there is no separate "edit draft"
      // screen; see the WizardState doc comment in ./types.ts.
      id: 4,
      title: 'Hiring Details',
      content:
        endorsement && !hiring ? (
          <HiringDetailsStep endorsement={endorsement} onSaved={refetch} />
        ) : endorsement && hiring ? (
          <ExecuteStep endorsement={endorsement} hiring={hiring} onExecuted={handleExecuted} />
        ) : (
          <PlaceholderPanel stepNumber={4} />
        ),
    },
    {
      id: 5,
      title: 'Execute',
      content: endorsement && hiring ? (
        <ExecuteStep endorsement={endorsement} hiring={hiring} onExecuted={handleExecuted} />
      ) : (
        <PlaceholderPanel stepNumber={5} />
      ),
    },
    {
      id: 6,
      title: 'Success',
      content: endorsement && hiring ? (
        <SuccessStep endorsement={endorsement} hiring={hiring} />
      ) : (
        <PlaceholderPanel stepNumber={6} />
      ),
    },
  ];

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Hiring Wizard</ToolbarPageTitle>
          <ToolbarDescription>Guide a candidate from endorsement to hire</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/hiring')}>
            <ArrowLeft size={16} className="me-1" />
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : (
        <div className="mt-6">
          <WizardStepper steps={steps} activeStep={activeStep} unlockedStep={unlockedStep} onStepChange={handleStepChange} />
        </div>
      )}
    </div>
  );
}
