import { v4 as uuidv4 } from 'uuid';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import {
  getActiveWatchedFields,
  getSnapshots,
  getApprovedStates,
  getExistingOpenFindingsByFingerprint,
  getOpenFindings as repositoryGetOpenFindings,
} from './repository';
import { computeFindingsDiff } from './components/ComputeFindingsDiff';
import { upsertFindings } from './components/UpsertFindings';
import type { RunFindingsResultDto, FindingDto } from './types';

export class FindingsOrchestrator {
  async runFindings(triggeredByEmail: string): Promise<RunFindingsResultDto> {
    const runId = uuidv4();
    const entityType = 'project';

    const [watchedFields, snapshots, approvedStates] = await Promise.all([
      getActiveWatchedFields(entityType),
      getSnapshots(entityType),
      getApprovedStates(entityType),
    ]);

    const diffs = computeFindingsDiff(entityType, watchedFields, snapshots, approvedStates);

    if (diffs.length === 0) {
      return {
        runId,
        findingsCreated: 0,
        findingsUpdated: 0,
        entitiesCompared: Object.keys(snapshots).length,
        fieldsChecked: watchedFields.length,
      };
    }

    const fingerprints = diffs.map((d) => d.fingerprint);
    const existingFindings = await getExistingOpenFindingsByFingerprint(fingerprints);

    const upsertResults = await upsertFindings(entityType, diffs);

    let findingsCreated = 0;
    let findingsUpdated = 0;

    for (const result of upsertResults) {
      const existingFinding = existingFindings.get(result.fingerprint);

      if (result.inserted) {
        findingsCreated++;
        await auditOrchestrator.log({
          entityName: 'fnd_findings',
          entityId: result.findingId.toString(),
          createdBy: triggeredByEmail,
          oldValues: null,
          newValues: {
            fnd_id: result.findingId,
            fnd_fingerprint: result.fingerprint,
          },
          comment: 'Finding created by change detection run',
        });
      } else {
        findingsUpdated++;
        await auditOrchestrator.log({
          entityName: 'fnd_findings',
          entityId: result.findingId.toString(),
          createdBy: triggeredByEmail,
          oldValues: existingFinding || null,
          newValues: {
            fnd_id: result.findingId,
            fnd_fingerprint: result.fingerprint,
            occurrence_count: existingFinding ? existingFinding.occurrenceCount + 1 : 1,
          },
          comment: 'Finding occurrence count updated',
        });
      }
    }

    return {
      runId,
      findingsCreated,
      findingsUpdated,
      entitiesCompared: Object.keys(snapshots).length,
      fieldsChecked: watchedFields.length,
    };
  }

  async getOpenFindings(entityType: string = 'project'): Promise<FindingDto[]> {
    return repositoryGetOpenFindings(entityType);
  }
}

export const findingsOrchestrator = new FindingsOrchestrator();
