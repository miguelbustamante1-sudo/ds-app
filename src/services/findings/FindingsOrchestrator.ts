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
  getFindings as repositoryGetFindings,
  getStatusCounts as repositoryGetStatusCounts,
  runStateRules as repositoryRunStateRules,
} from './repository';
import { StateRulesRunError } from './errors';
import { reconcileFindings } from './components/ReconcileFindings';
import { applyFindingsPlan, type FindingMutation } from './components/ApplyFindingsPlan';
import { buildObservations, recordObservations } from './components/RecordObservations';
import { syncFindingTasks } from './components/SyncFindingTasks';
import type {
  RunFindingsResultDto,
  RunStateRulesResultDto,
  FindingDto,
  FindingStatusCountDto,
  StateRuleViolationDto,
} from './types';
import { STATE_RULE_ACTION_RESOLVED, STATE_RULE_ACTION_RESOLVED_CONFIRMED } from './types';

const STATE_RULE_RESOLVE_ACTIONS = new Set([STATE_RULE_ACTION_RESOLVED, STATE_RULE_ACTION_RESOLVED_CONFIRMED]);

const AUDIT_COMMENTS: Record<FindingMutation['kind'], string> = {
  open: 'Finding opened by change detection run',
  recur: 'Finding recurrence recorded by change detection run',
  self_resolve: 'Finding self-resolved: value reverted to approved baseline',
  resolve_confirmed: 'Acknowledged finding confirmed fixed: value reverted to approved baseline',
  supersede: 'Finding superseded by a newer value',
};

export class FindingsOrchestrator {
  async runFindings(triggeredByEmail: string, entityType: string): Promise<RunFindingsResultDto> {
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

      // Same click also creates and closes review tasks (Findings Review Workflow).
      const taskSync = await syncFindingTasks(triggeredByEmail);

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
        ...taskSync,
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

  async runStateRules(triggeredByEmail: string): Promise<RunStateRulesResultDto> {
    let rows: StateRuleViolationDto[];
    try {
      rows = await repositoryRunStateRules();
    } catch (err: unknown) {
      throw new StateRulesRunError(err instanceof Error ? err.message : 'Unknown error');
    }

    const findingsResolved = rows.filter((row) => STATE_RULE_RESOLVE_ACTIONS.has(row.finding_action)).length;
    const violationsFound = rows.length - findingsResolved;

    // The upserts and self-resolves happen inside the Postgres function, so this is one batch-level entry per run.
    await auditOrchestrator.log({
      entityName: 'fnd_findings',
      entityId: 'state-rules-run',
      createdBy: triggeredByEmail,
      oldValues: null,
      newValues: { violationsFound, findingsResolved, rows },
      comment: `${violationsFound} state-rule violations evaluated, ${findingsResolved} findings self-resolved`,
    });

    const taskSync = await syncFindingTasks(triggeredByEmail);

    return { violationsFound, findingsResolved, details: rows, ...taskSync };
  }

  async getFindings(entityType: string, status?: string): Promise<FindingDto[]> {
    return repositoryGetFindings(entityType, status);
  }

  async getStatusCounts(entityType: string): Promise<FindingStatusCountDto[]> {
    return repositoryGetStatusCounts(entityType);
  }
}

export const findingsOrchestrator = new FindingsOrchestrator();
