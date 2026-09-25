import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import type { ApplyPlanResult, FindingInsert, ReconcileAction } from '../types';

const RESOLUTION_SELF_RESOLVED = 'auto: value reverted to approved baseline';
const STATUS_ACKNOWLEDGED = 'acknowledged';
const RESOLUTION_SUPERSEDED = 'auto: superseded by newer value';

export interface FindingMutation {
  /** resolve_confirmed: a self-resolve of a finding the reviewer had already acknowledged. */
  kind: ReconcileAction['kind'] | 'resolve_confirmed';
  findingId: number;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

type Tx = Prisma.TransactionClient;

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function serialize(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}

async function snapshotRow(tx: Tx, findingId: number) {
  const row = await tx.fndFinding.findUnique({ where: { findingId } });
  return row ? serialize(row as unknown as Record<string, unknown>) : null;
}

async function insertFinding(tx: Tx, entityType: string, insert: FindingInsert) {
  const now = new Date();
  return tx.fndFinding.create({
    data: {
      fingerprint: insert.fingerprint,
      entityType,
      entityId: insert.entityId,
      fieldPath: insert.fieldPath,
      changeType: insert.changeType,
      oldValue: toJson(insert.oldValue),
      newValue: toJson(insert.newValue),
      severity: 'medium',
      status: 'open',
      firstSeen: now,
      lastSeen: now,
      occurrenceCount: 1,
    },
  });
}

export async function applyFindingsPlan(
  entityType: string,
  actions: ReconcileAction[],
): Promise<{ result: ApplyPlanResult; mutations: FindingMutation[] }> {
  const result: ApplyPlanResult = { opened: 0, recurred: 0, resolved: 0, superseded: 0 };
  const mutations: FindingMutation[] = [];

  if (actions.length === 0) return { result, mutations };

  await prisma.$transaction(
    async (tx) => {
      for (const action of actions) {
        switch (action.kind) {
          case 'self_resolve': {
            const before = await snapshotRow(tx, action.findingId);
            // An acknowledged finding (reviewer disagreed) that reverts is a confirmed fix,
            // and keeps the reviewer's comment in resolution.
            const confirmed = before?.status === STATUS_ACKNOWLEDGED;
            const after = await tx.fndFinding.update({
              where: { findingId: action.findingId },
              data: confirmed
                ? { status: 'resolved_confirmed', resolvedAt: new Date() }
                : { status: 'self_resolved', resolvedAt: new Date(), resolution: RESOLUTION_SELF_RESOLVED },
            });
            result.resolved++;
            mutations.push({
              kind: confirmed ? 'resolve_confirmed' : 'self_resolve',
              findingId: action.findingId,
              before,
              after: serialize(after as unknown as Record<string, unknown>),
            });
            break;
          }

          case 'recur': {
            const before = await snapshotRow(tx, action.findingId);
            const after = await tx.fndFinding.update({
              where: { findingId: action.findingId },
              data: { lastSeen: new Date(), occurrenceCount: { increment: 1 } },
            });
            result.recurred++;
            mutations.push({
              kind: 'recur',
              findingId: action.findingId,
              before,
              after: serialize(after as unknown as Record<string, unknown>),
            });
            break;
          }

          case 'open': {
            const created = await insertFinding(tx, entityType, action.insert);
            result.opened++;
            mutations.push({
              kind: 'open',
              findingId: created.findingId,
              before: null,
              after: serialize(created as unknown as Record<string, unknown>),
            });
            break;
          }

          case 'supersede': {
            // The old row must leave status='open' before the replacement is inserted:
            // uq_fnd_open_entity_field would otherwise reject the second open row, and a
            // unique index cannot be deferred. superseded_by is backfilled afterwards.
            const before = await snapshotRow(tx, action.findingId);
            await tx.fndFinding.update({
              where: { findingId: action.findingId },
              data: {
                status: 'superseded',
                resolvedAt: new Date(),
                resolution: RESOLUTION_SUPERSEDED,
              },
            });

            const created = await insertFinding(tx, entityType, action.insert);

            const after = await tx.fndFinding.update({
              where: { findingId: action.findingId },
              data: { supersededById: created.findingId },
            });

            result.superseded++;
            result.opened++;
            mutations.push({
              kind: 'supersede',
              findingId: action.findingId,
              before,
              after: serialize(after as unknown as Record<string, unknown>),
            });
            mutations.push({
              kind: 'open',
              findingId: created.findingId,
              before: null,
              after: serialize(created as unknown as Record<string, unknown>),
            });
            break;
          }
        }
      }
    },
    { timeout: 60_000 },
  );

  return { result, mutations };
}
