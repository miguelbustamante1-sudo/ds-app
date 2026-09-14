import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BackToHubButton } from '@/components/BackToHubButton';
import { useToast } from '@/hooks/use-toast';
import { getPerformanceCase, getCasePhases, deleteCase, listCheckIns } from '@/api/performanceCases';
import { PhaseStepper } from './PhaseStepper';
import { PhaseFieldsForm } from './PhaseFieldsForm';
import { CheckInForm } from './CheckInForm';
import { CheckInHistory } from './CheckInHistory';
import { CaseActionButtons } from './CaseActionButtons';
import { DocumentsPanel } from './DocumentsPanel';
import { formatCaseTitle } from './caseDisplay';
import type {
  PerformanceCaseCheckInDTO,
  PerformanceCaseDTO,
  PerformanceCaseDisplayDTO,
  PerformanceCasePhaseDTO,
  PerformanceCasePhaseName,
} from '@shared/dto';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [perfCase, setPerfCase] = useState<PerformanceCaseDisplayDTO | null>(null);
  const [phases, setPhases] = useState<PerformanceCasePhaseDTO[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PerformanceCasePhaseName | null>(null);
  const [checkIns, setCheckIns] = useState<PerformanceCaseCheckInDTO[]>([]);
  const [checkInsLoading, setCheckInsLoading] = useState(false);

  async function loadCheckIns(id: number) {
    setCheckInsLoading(true);
    try {
      setCheckIns(await listCheckIns(id));
    } catch (err) {
      toast({ title: 'Failed to load check-ins', description: String(err), variant: 'destructive' });
    } finally {
      setCheckInsLoading(false);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    const id = Number(caseId);
    Promise.all([getPerformanceCase(id), getCasePhases(id)])
      .then(([c, p]) => {
        setPerfCase(c);
        setPhases(p);
        void loadCheckIns(id);
      })
      .catch((err: unknown) => {
        toast({ title: 'Cannot open case', description: String(err), variant: 'destructive' });
        navigate('/performance-cases');
      });
  }, [caseId, navigate, toast]);

  const currentPhase = perfCase?.currentPhase;
  useEffect(() => {
    if (currentPhase) setSelectedPhase(currentPhase);
  }, [currentPhase]);

  function handlePhaseSaved(saved: PerformanceCasePhaseDTO) {
    setPhases((prev) => prev.map((p) => (p.phasePkId === saved.phasePkId ? saved : p)));
  }

  function mergeCase(updated: PerformanceCaseDTO) {
    setPerfCase((prev) => (prev ? { ...prev, ...updated } : updated));
  }

  async function handleAdvanced(updated: PerformanceCaseDTO) {
    const refreshedPhases = await getCasePhases(updated.caseId);
    setPhases(refreshedPhases);
    mergeCase(updated);
  }

  if (!perfCase) return null;

  const isDeletable = perfCase.currentPhase === 'PHASE_0' && perfCase.caseStatus === 'ACTIVE';
  const activePhase = selectedPhase ?? perfCase.currentPhase;
  const isViewingCurrent = activePhase === perfCase.currentPhase;

  async function handleDeleteConfirm() {
    if (!perfCase) return;
    try {
      await deleteCase(perfCase.caseId);
      toast({ title: 'Case removed' });
      navigate('/performance-cases');
    } catch (err) {
      toast({ title: 'Failed to remove case', description: String(err), variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>{formatCaseTitle(perfCase)}</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/performance-cases')}>
            Back to Cases
          </Button>
          <BackToHubButton hubPath="/performance-management-hub" />
          {isDeletable && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 size={16} className="text-destructive mr-1" />
              Delete Case
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Phase Progress</CardTitle>
          <PhaseStepper currentPhase={perfCase.currentPhase} selectedPhase={activePhase} onSelect={setSelectedPhase} />
          <div className="mt-6">
            <PhaseFieldsForm
              perfCase={perfCase}
              phase={activePhase}
              phaseRow={phases.find((p) => p.phase === activePhase)}
              onSaved={handlePhaseSaved}
              onAdvanced={handleAdvanced}
            />
          </div>
          {isViewingCurrent && perfCase.currentPhase === 'PHASE_5' && (
            <div className="mt-6">
              <CheckInForm caseId={perfCase.caseId} onLogged={() => void loadCheckIns(perfCase.caseId)} />
            </div>
          )}
          {isViewingCurrent && (
            <div className="mt-6">
              <CaseActionButtons perfCase={perfCase} onUpdated={mergeCase} />
            </div>
          )}
        </CardContent>
      </Card>
      {(checkIns.length > 0 || perfCase.currentPhase === 'PHASE_5') && (
        <div className="mt-6">
          <CheckInHistory checkIns={checkIns} loading={checkInsLoading} />
        </div>
      )}
      <div className="mt-6">
        <DocumentsPanel caseId={perfCase.caseId} />
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete case "{perfCase.caseCode}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
