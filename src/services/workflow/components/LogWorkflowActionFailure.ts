import { prisma } from '../../../db/prisma';

interface LogFailureParams {
  winId: string;
  witId?: string | null;
  performedBy: string;
  err: unknown;
}

/**
 * Writes a standalone, non-transactional WAL row recording that a workflow
 * action failed. Every action's own WAL writes happen inside its
 * prisma.$transaction — if that transaction fails, those writes roll back
 * with everything else, leaving no trace of what went wrong. This runs
 * outside any transaction so the failure itself survives the rollback.
 *
 * Called from route catch blocks (after the orchestrator has already
 * thrown), not from inside the orchestrators themselves, so one call site
 * per route uniformly covers every workflow action without duplicating this
 * logic in each orchestrator.
 */
export async function logWorkflowActionFailure(params: LogFailureParams): Promise<void> {
  const { winId, witId, performedBy, err } = params;

  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: unknown } | null)?.code;

  try {
    await prisma.walWorkflowAuditLog.create({
      data: {
        winId,
        witId: witId ?? null,
        eventType: 'ACTION_FAILED',
        performedBy,
        detailsJson: {
          errorMessage: message,
          ...(typeof code === 'string' ? { errorCode: code } : {}),
        },
      },
    });
  } catch (logErr: unknown) {
    // Never let failure-logging itself mask or replace the original error.
    console.error('logWorkflowActionFailure: failed to write WAL failure entry', logErr);
  }
}
