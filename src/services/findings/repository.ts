import { prisma } from '../../db/prisma';
import type { WatchedField, FindingDto } from './types';

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

export async function getExistingOpenFindingsByFingerprint(fingerprints: string[]): Promise<Map<string, any>> {
  const findings = await prisma.fndFinding.findMany({
    where: {
      fingerprint: {
        in: fingerprints,
      },
      status: 'open',
    },
    select: {
      fingerprint: true,
      findingId: true,
      occurrenceCount: true,
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
    },
  });

  const map = new Map<string, any>();
  findings.forEach((f) => {
    map.set(f.fingerprint, {
      findingId: f.findingId,
      entityType: f.entityType,
      entityId: f.entityId,
      fieldPath: f.fieldPath,
      changeType: f.changeType,
      oldValue: f.oldValue,
      newValue: f.newValue,
      severity: f.severity,
      status: f.status,
      assignee: f.assignee,
      firstSeen: f.firstSeen,
      lastSeen: f.lastSeen,
      occurrenceCount: f.occurrenceCount,
    });
  });
  return map;
}

export async function getOpenFindings(entityType: string): Promise<FindingDto[]> {
  const findings = await prisma.fndFinding.findMany({
    where: {
      entityType,
      status: 'open',
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
    },
    orderBy: [{ lastSeen: 'desc' }, { findingId: 'desc' }],
  });

  // Fetch watched fields for display names
  const watchedFields = await getActiveWatchedFields(entityType);
  const fieldMap = new Map(watchedFields.map((f) => [f.fieldPath, f.displayName]));

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
    fieldDisplayName: f.fieldPath ? fieldMap.get(f.fieldPath) : undefined,
  }));
}
