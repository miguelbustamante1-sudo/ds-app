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
import { getPerformanceCase, getCasePhases, deleteCase } from '@/api/performanceCases';
import { PhaseStepper } from './PhaseStepper';
import { PhaseFieldsForm } from './PhaseFieldsForm';
import { CheckInForm } from './CheckInForm';
import { CaseActionButtons } from './CaseActionButtons';
import { DocumentsPanel } from './DocumentsPanel';
import type { PerformanceCaseDTO, PerformanceCasePhaseDTO } from '@shared/dto';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [perfCase, setPerfCase] = useState<PerformanceCaseDTO | null>(null);
  const [phases, setPhases] = useState<PerformanceCasePhaseDTO[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    const id = Number(caseId);
    Promise.all([getPerformanceCase(id), getCasePhases(id)])
      .then(([c, p]) => {
        setPerfCase(c);
        setPhases(p);
      })
      .catch((err: unknown) => {
        toast({ title: 'Cannot open case', description: String(err), variant: 'destructive' });
        navigate('/performance-cases');
      });
  }, [caseId, navigate, toast]);

  function handlePhaseSaved(saved: PerformanceCasePhaseDTO) {
    setPhases((prev) => prev.map((p) => (p.phasePkId === saved.phasePkId ? saved : p)));
  }

  async function handleAdvanced(updated: PerformanceCaseDTO) {
    setPerfCase(updated);
    setPhases(await getCasePhases(updated.caseId));
  }

  if (!perfCase) return null;

  const isDeletable = perfCase.currentPhase === 'PHASE_0' && perfCase.caseStatus === 'ACTIVE';

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
          <ToolbarPageTitle>
            {`${perfCase.caseCode}${perfCase.caseLabel ? ` — ${perfCase.caseLabel}` : ''}`}
          </ToolbarPageTitle>
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
          <PhaseStepper currentPhase={perfCase.currentPhase} />
          <div className="mt-6">
            <PhaseFieldsForm
              perfCase={perfCase}
              phaseRow={phases.find((p) => p.phase === perfCase.currentPhase)}
              onSaved={handlePhaseSaved}
              onAdvanced={handleAdvanced}
            />
          </div>
          {perfCase.currentPhase === 'PHASE_5' && (
            <div className="mt-6">
              <CheckInForm caseId={perfCase.caseId} />
            </div>
          )}
          <div className="mt-6">
            <CaseActionButtons perfCase={perfCase} onUpdated={setPerfCase} />
          </div>
        </CardContent>
      </Card>
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
