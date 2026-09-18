import { randomUUID } from 'crypto';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import {
  completeRunLog,
  countApprovedStates,
  countSnapshots,
  failRunLog,
  getActiveWatchedFields,
  getApprovedStates,
  getOpenFindingRefs,
  getSnapshots,
  startRunLog,
  getOpenFindings as repositoryGetOpenFindings,
} from './repository';
import { reconcileFindings } from './components/ReconcileFindings';
import { applyFindingsPlan, type FindingMutation } from './components/ApplyFindingsPlan';
import { buildObservations, recordObservations } from './components/RecordObservations';
import type { RunFindingsResultDto, FindingDto } from './types';

const AUDIT_COMMENTS: Record<FindingMutation['kind'], string> = {
  open: 'Finding opened by change detection run',
  recur: 'Finding recurrence recorded by change detection run',
  self_resolve: 'Finding self-resolved: value reverted to approved baseline',
  supersede: 'Finding superseded by a newer value',
};

export class FindingsOrchestrator {
  async runFindings(triggeredByEmail: string, entityType = 'project'): Promise<RunFindingsResultDto> {
    const runId = randomUUID();

    const [expectedRowCount, actualRowCount] = await Promise.all([
      countApprovedStates(entityType),
      countSnapshots(entityType),
    ]);

    const runLog = await startRunLog(entityType, expectedRowCount, actualRowCount);

    await auditOrchestrator.log({
      entityName: 'rnl_run_log',
      entityId: String(runLog.runLogId),
      createdBy: triggeredByEmail,
      oldValues: null,
      newValues: { rnl_id: runLog.runLogId, status: 'running', expectedRowCount, actualRowCount },
      comment: `Change detection run started for ${entityType}`,
    });

    try {
      const [watchedFields, snapshots, approvedStates, openFindings] = await Promise.all([
        getActiveWatchedFields(entityType),
        getSnapshots(entityType),
        getApprovedStates(entityType),
        getOpenFindingRefs(entityType),
      ]);

      const { actions, entitiesCompared } = reconcileFindings(
        entityType,
        watchedFields,
        snapshots,
        approvedStates,
        openFindings,
      );

      const { result, mutations } = await applyFindingsPlan(entityType, actions);

      for (const mutation of mutations) {
        await auditOrchestrator.log({
          entityName: 'fnd_findings',
          entityId: String(mutation.findingId),
          createdBy: triggeredByEmail,
          oldValues: mutation.before,
          newValues: mutation.after,
          comment: AUDIT_COMMENTS[mutation.kind],
        });
      }

      const observationsRecorded = await recordObservations(entityType, buildObservations(snapshots));

      if (observationsRecorded > 0) {
        await auditOrchestrator.log({
          entityName: 'obs_observations',
          entityId: String(runLog.runLogId),
          createdBy: triggeredByEmail,
          oldValues: null,
          newValues: { rnl_id: runLog.runLogId, rows_inserted: observationsRecorded },
          comment: `${observationsRecorded} observation rows recorded for ${entityType}`,
        });
      }

      const completed = await completeRunLog(runLog.runLogId, {
        recordsCompared: entitiesCompared,
        findingsOpened: result.opened,
        findingsClosed: result.resolved,
      });

      await auditOrchestrator.log({
        entityName: 'rnl_run_log',
        entityId: String(runLog.runLogId),
        createdBy: triggeredByEmail,
        oldValues: { rnl_id: runLog.runLogId, status: 'running' },
        newValues: {
          rnl_id: completed.runLogId,
          status: completed.status,
          recordsCompared: completed.recordsCompared,
          findingsOpened: completed.findingsOpened,
          findingsClosed: completed.findingsClosed,
        },
        comment: `Change detection run completed for ${entityType}`,
      });

      return {
        runId,
        runLogId: runLog.runLogId,
        findingsCreated: result.opened,
        findingsUpdated: result.recurred,
        findingsResolved: result.resolved,
        findingsSuperseded: result.superseded,
        entitiesCompared,
        fieldsChecked: watchedFields.length,
        observationsRecorded,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await failRunLog(runLog.runLogId, message);

      await auditOrchestrator.log({
        entityName: 'rnl_run_log',
        entityId: String(runLog.runLogId),
        createdBy: triggeredByEmail,
        oldValues: { rnl_id: runLog.runLogId, status: 'running' },
        newValues: { rnl_id: runLog.runLogId, status: 'failed', error: message },
        comment: `Change detection run failed for ${entityType}`,
      });

      throw err;
    }
  }

  async getOpenFindings(entityType: string = 'project'): Promise<FindingDto[]> {
    return repositoryGetOpenFindings(entityType);
  }
}

export const findingsOrchestrator = new FindingsOrchestrator();
