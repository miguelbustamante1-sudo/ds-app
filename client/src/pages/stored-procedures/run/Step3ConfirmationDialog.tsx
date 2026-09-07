import { CheckCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProcedureSignatureDTO, StoredProcedureSummaryDTO } from '@shared/dto/StoredProcedure';
import type { WizardFormData } from './types';

interface Step3Props {
  procedure: StoredProcedureSummaryDTO;
  signature: ProcedureSignatureDTO;
  parameters: WizardFormData;
  executing: boolean;
  executionResult: { success: boolean; message: string } | null;
  onExecute: () => void;
  onReset: () => void;
}

export function Step3ConfirmationDialog({
  procedure,
  signature,
  parameters,
  executing,
  executionResult,
  onExecute,
  onReset,
}: Step3Props) {
  // Post-execution: show result (success or failure)
  if (executionResult !== null) {
    return (
      <div className="space-y-4 text-center">
        {executionResult.success ? (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="font-semibold text-lg">Execution Successful</h3>
          </>
        ) : (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="font-semibold text-lg text-destructive">Execution Failed</h3>
          </>
        )}
        <p className="text-sm text-muted-foreground">{executionResult.message}</p>
        <Button onClick={onReset} className="mt-4">
          Execute Another Procedure
        </Button>
      </div>
    );
  }

  // Pre-execution: show confirmation summary + explicit confirm button
  const inParams = signature.parameters.filter((p) => p.mode === 'in');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Confirm Execution</h3>
      <div className="rounded-md border p-4 space-y-2 text-sm">
        <div>
          <span className="font-medium">Procedure:</span>{' '}
          <span className="text-muted-foreground">{procedure.spLabel}</span>
        </div>
        {inParams.length > 0 ? (
          <div>
            <span className="font-medium">Parameters:</span>
            <ul className="mt-1 ml-4 list-disc space-y-1 text-muted-foreground">
              {inParams.map((p) => (
                <li key={p.parameterName}>
                  {p.parameterName}: {String(parameters[p.parameterName] ?? 'null')}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-muted-foreground">No parameters — this procedure takes no inputs.</div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        This action will execute the procedure against the database. Confirm to proceed.
      </p>
      <div className="flex justify-end">
        <Button onClick={onExecute} disabled={executing}>
          {executing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1 h-4 w-4" />
          )}
          {executing ? 'Executing...' : 'Confirm & Execute'}
        </Button>
      </div>
    </div>
  );
}
