import { useEffect, useState } from 'react';
import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listActiveProcedures, getProcedureSignature, executeProcedure } from './api';
import { Step1ProcedurePicker } from './Step1ProcedurePicker';
import { Step2ParameterForm } from './Step2ParameterForm';
import { Step3ConfirmationDialog } from './Step3ConfirmationDialog';
import type { RunWizardState, WizardFormData } from './types';
import type { StoredProcedureSummaryDTO } from '@shared/dto/StoredProcedure';

const INITIAL_STATE: RunWizardState = {
  step: 1,
  selectedProcedureId: null,
  signature: null,
  parameters: {},
  executing: false,
  executionResult: null,
};

export function RunProcedureWizard() {
  const { toast } = useToast();
  const [state, setState] = useState<RunWizardState>(INITIAL_STATE);
  const [procedures, setProcedures] = useState<StoredProcedureSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcedure, setSelectedProcedure] = useState<StoredProcedureSummaryDTO | null>(null);

  useEffect(() => {
    listActiveProcedures()
      .then(setProcedures)
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load procedures', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProcedureSelected = async (spId: number) => {
    try {
      const proc = procedures.find((p) => p.spId === spId) ?? null;
      setSelectedProcedure(proc);
      setState((prev) => ({ ...prev, selectedProcedureId: spId }));

      const sig = await getProcedureSignature(spId);
      setState((prev) => ({ ...prev, signature: sig, parameters: {} }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch signature';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleParametersChange = (params: WizardFormData) => {
    setState((prev) => ({ ...prev, parameters: params }));
  };

  const handleExecute = async () => {
    if (!state.selectedProcedureId) return;

    setState((prev) => ({ ...prev, executing: true, executionResult: null }));
    try {
      const result = await executeProcedure(state.selectedProcedureId, state.parameters);
      setState((prev) => ({ ...prev, executing: false, executionResult: result }));
      toast({ title: 'Success', description: result.message });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      setState((prev) => ({
        ...prev,
        executing: false,
        executionResult: { success: false, message },
      }));
    }
  };

  const handleBack = () => {
    if (state.step === 3 && state.executionResult !== null) {
      setState(INITIAL_STATE);
      return;
    }
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1) as 1 | 2 | 3,
      executionResult: null,
    }));
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Execute Stored Procedure</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>

      {/* Stepper */}
      <div className="mt-6 mb-6 flex items-center gap-2">
        {(['Step 1: Select', 'Step 2: Parameters', 'Step 3: Confirm'] as const).map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3;
          const active = state.step === stepNum;
          const done = state.step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepNum}
              </div>
              <span className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {idx < 2 && <span className="text-muted-foreground">→</span>}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {state.step === 1 && (
            <Step1ProcedurePicker
              procedures={procedures}
              selectedId={state.selectedProcedureId}
              onSelect={handleProcedureSelected}
            />
          )}
          {state.step === 2 && state.signature && selectedProcedure && (
            <Step2ParameterForm
              procedure={selectedProcedure}
              signature={state.signature}
              parameters={state.parameters}
              onParametersChange={handleParametersChange}
            />
          )}
          {state.step === 3 && selectedProcedure && state.signature && (
            <Step3ConfirmationDialog
              procedure={selectedProcedure}
              signature={state.signature}
              parameters={state.parameters}
              executing={state.executing}
              executionResult={state.executionResult}
              onExecute={handleExecute}
              onReset={() => setState(INITIAL_STATE)}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation — Back hidden after execution completes (Step3 has its own reset) */}
      <div className="mt-4 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={state.step === 1 || state.executing || (state.step === 3 && state.executionResult !== null)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {/* Next advances to Step 3 (confirmation); Step 3 has its own Confirm & Execute button */}
        {state.step < 3 && (
          <Button
            onClick={() => setState((prev) => ({ ...prev, step: Math.min(3, prev.step + 1) as 1 | 2 | 3 }))}
            disabled={state.step === 1 && !state.selectedProcedureId}
          >
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
