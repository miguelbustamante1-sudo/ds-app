import { prisma } from '../../db/prisma';
import { LIVE_FINDING_STATUSES } from './types';
import type {
  WatchedField,
  FindingDto,
  OpenFindingRef,
  FindingStatusCountDto,
  StateRuleViolationDto,
  CreatedFindingTaskRow,
  ClosedFindingTaskRow,
} from './types';

export async function getActiveWatchedFields(entityType: string): Promise<WatchedField[]> {
  const fields = await prisma.cdfWatchedField.findMany({
    where: {
      entityType,
      active: true,
    },
    select: {
      fieldPath: true,
      displayName: true,
    },
  });

  return fields.map((f) => ({
    fieldPath: f.fieldPath,
    displayName: f.displayName,
  }));
}

export async function getSnapshots(entityType: string): Promise<Record<string, Record<string, any>>> {
  const rows = await prisma.snpEntitySnapshot.findMany({
    where: {
      entityType,
    },
    select: {
      entityId: true,
      payload: true,
    },
  });

  const map: Record<string, Record<string, any>> = {};
  rows.forEach((r) => {
    map[r.entityId] = r.payload as Record<string, any>;
  });
  return map;
}

export async function getApprovedStates(entityType: string): Promise<Record<string, Record<string, any>>> {
  const rows = await prisma.apsApprovedState.findMany({
    where: {
      entityType,
    },
    select: {
      entityId: true,
      payload: true,
    },
  });

  const map: Record<string, Record<string, any>> = {};
  rows.forEach((r) => {
    map[r.entityId] = r.payload as Record<string, any>;
  });
  return map;
}

/**
 * Live change-engine findings — open or acknowledged. Rule findings (rul_id set) are owned
 * by fn_run_state_rules.
 */
export async function getOpenFindingRefs(entityType: string): Promise<OpenFindingRef[]> {
  const findings = await prisma.fndFinding.findMany({
    where: { entityType, status: { in: LIVE_FINDING_STATUSES }, ruleId: null },
    select: { findingId: true, entityId: true, fieldPath: true, newValue: true },
  });

  return findings.map((f) => ({
    findingId: f.findingId,
    entityId: f.entityId,
    fieldPath: f.fieldPath,
    newValue: f.newValue,
  }));
}

export async function getFindings(entityTypes: string[], status?: string): Promise<FindingDto[]> {
  const findings = await prisma.fndFinding.findMany({
    where: {
      entityType: { in: entityTypes },
      ...(status ? { status } : {}),
    },
    select: {
      findingId: true,
      fingerprint: true,
      entityType: true,
      entityId: true,
      fieldPath: true,
      changeType: true,
      oldValue: true,
      newValue: true,
      severity: true,
      status: true,
      assignee: true,
      firstSeen: true,
      lastSeen: true,
      occurrenceCount: true,
      ruleId: true,
      detectionRule: { select: { ruleType: true, definition: true } },
    },
    orderBy: [{ lastSeen: 'desc' }, { findingId: 'desc' }],
  });

  // Keyed by entity type too: the same field path can mean different fields on different objects.
  const watchedFields = await prisma.cdfWatchedField.findMany({
    where: { entityType: { in: entityTypes }, active: true },
    select: { entityType: true, fieldPath: true, displayName: true },
  });
  const fieldKey = (entityType: string, fieldPath: string) => `${entityType}\u0000${fieldPath}`;
  const fieldMap = new Map(watchedFields.map((f) => [fieldKey(f.entityType, f.fieldPath), f.displayName]));

  return findings.map((f) => ({
    fndId: f.findingId,
    fndFingerprint: f.fingerprint,
    cdeEntityType: f.entityType,
    fndEntityId: f.entityId,
    cdfFieldPath: f.fieldPath,
    changeType: (f.changeType as 'added' | 'deleted' | 'modified' | null) || null,
    oldValue: f.oldValue,
    newValue: f.newValue,
    severity: f.severity,
    status: f.status,
    assignee: f.assignee,
    firstSeen: f.firstSeen.toISOString(),
    lastSeen: f.lastSeen.toISOString(),
    occurrenceCount: f.occurrenceCount,
    fieldDisplayName: f.fieldPath ? fieldMap.get(fieldKey(f.entityType, f.fieldPath)) : undefined,
    rulId: f.ruleId,
    rulType: f.detectionRule?.ruleType ?? null,
    rulDefinition: f.detectionRule?.definition ?? null,
  }));
}

export async function countApprovedStates(entityType: string): Promise<number> {
  return prisma.apsApprovedState.count({ where: { entityType } });
}

export async function countSnapshots(entityType: string): Promise<number> {
  return prisma.snpEntitySnapshot.count({ where: { entityType } });
}

export async function startRunLog(
  entityType: string,
  expectedRowCount: number,
  actualRowCount: number,
) {
  return prisma.rnlRunLog.create({
    data: { entityType, status: 'running', startedAt: new Date(), expectedRowCount, actualRowCount },
  });
}

export async function completeRunLog(
  runLogId: number,
  counts: { recordsCompared: number; findingsOpened: number; findingsClosed: number },
) {
  return prisma.rnlRunLog.update({
    where: { runLogId },
    data: {
      status: 'completed',
      finishedAt: new Date(),
      recordsCompared: counts.recordsCompared,
      findingsOpened: counts.findingsOpened,
      findingsClosed: counts.findingsClosed,
    },
  });
}

export async function failRunLog(runLogId: number, message: string) {
  return prisma.rnlRunLog.update({
    where: { runLogId },
    data: { status: 'failed', finishedAt: new Date(), error: message },
  });
}

/** Statuses actually present in the data, so new ones surface as filters without a code change. */
export async function getStatusCounts(entityTypes: string[]): Promise<FindingStatusCountDto[]> {
  const rows = await prisma.fndFinding.groupBy({
    by: ['entityType', 'status'],
    where: { entityType: { in: entityTypes } },
    _count: { _all: true },
    orderBy: [{ entityType: 'asc' }, { status: 'asc' }],
  });

  return rows.map((row) => ({ entityType: row.entityType, status: row.status, count: row._count._all }));
}

/** Evaluates active state rules and upserts violations into ds.fnd_findings inside Postgres. */
export async function runStateRules(): Promise<StateRuleViolationDto[]> {
  return prisma.$queryRaw<StateRuleViolationDto[]>`SELECT * FROM ds.fn_run_state_rules()`;
}

/** Starts a review workflow for every live finding without one (win_id IS NULL). */
export async function createFindingTasks(): Promise<CreatedFindingTaskRow[]> {
  return prisma.$queryRaw<CreatedFindingTaskRow[]>`SELECT * FROM ds.fn_create_finding_tasks()`;
}

/** Closes the open task of every finding that was fixed, superseded, retired or approved. */
export async function closeResolvedFindingTasks(): Promise<ClosedFindingTaskRow[]> {
  return prisma.$queryRaw<ClosedFindingTaskRow[]>`SELECT * FROM ds.fn_close_resolved_finding_tasks()`;
}
