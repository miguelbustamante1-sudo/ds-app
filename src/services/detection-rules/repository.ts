import { prisma } from '../../db/prisma';
import { LIVE_FINDING_STATUSES } from '../findings/types';
import type { Prisma } from '@prisma/client';
import type {
  DetectionRuleDefinition,
  DetectionRuleDto,
  DetectionRuleSeverity,
  DetectionRuleType,
} from '@shared/dto';

type RuleRow = Prisma.RulDetectionRuleGetPayload<object>;

/** This screen manages state rules only; 'change' rules belong to the change-detection run. */
export const STATE_RULE_CLASS = 'state';

const RULE_RETIRED_STATUS = 'rule_retired';
const RULE_RETIRED_RESOLUTION = 'auto: rule deactivated';

function toRuleDto(row: RuleRow, openFindingCount: number): DetectionRuleDto {
  return {
    ruleId: row.ruleId,
    entityType: row.entityType,
    ruleClass: row.ruleClass,
    ruleType: row.ruleType as DetectionRuleType,
    definition: row.definition as unknown as DetectionRuleDefinition,
    severity: row.severity as DetectionRuleSeverity,
    version: row.version,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    openFindingCount,
  };
}

function serialize(row: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}

async function countOpenFindings(ruleId: number): Promise<number> {
  return prisma.fndFinding.count({ where: { ruleId, status: { in: LIVE_FINDING_STATUSES } } });
}

export async function listRules(): Promise<DetectionRuleDto[]> {
  const [rows, counts] = await Promise.all([
    prisma.rulDetectionRule.findMany({ where: { ruleClass: STATE_RULE_CLASS }, orderBy: { ruleId: 'asc' } }),
    prisma.fndFinding.groupBy({
      by: ['ruleId'],
      where: { status: { in: LIVE_FINDING_STATUSES }, ruleId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countByRule = new Map(counts.map((c) => [c.ruleId, c._count._all]));
  return rows.map((row) => toRuleDto(row, countByRule.get(row.ruleId) ?? 0));
}

export async function getRule(ruleId: number): Promise<DetectionRuleDto | null> {
  const row = await prisma.rulDetectionRule.findFirst({ where: { ruleId, ruleClass: STATE_RULE_CLASS } });
  return row ? toRuleDto(row, await countOpenFindings(ruleId)) : null;
}

export async function findActiveRulesOnField(
  entityType: string,
  ruleType: DetectionRuleType,
  field: string,
): Promise<DetectionRuleDto[]> {
  const rows = await prisma.rulDetectionRule.findMany({
    where: {
      entityType,
      ruleClass: STATE_RULE_CLASS,
      ruleType,
      active: true,
      definition: { path: ['field'], equals: field },
    },
  });
  return rows.map((row) => toRuleDto(row, 0));
}

export async function listActiveEntityTypes(): Promise<string[]> {
  const rows = await prisma.cdeWatchedEntity.findMany({
    where: { active: true },
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
  });
  return rows.map((r) => r.entityType);
}

export async function entityTypeExists(entityType: string): Promise<boolean> {
  return (await prisma.cdeWatchedEntity.count({ where: { entityType } })) > 0;
}

export async function createRule(
  data: {
    entityType: string;
    ruleType: DetectionRuleType;
    definition: DetectionRuleDefinition;
    severity: DetectionRuleSeverity;
  },
  actor: string,
): Promise<DetectionRuleDto> {
  const row = await prisma.rulDetectionRule.create({
    data: {
      entityType: data.entityType,
      ruleClass: STATE_RULE_CLASS,
      ruleType: data.ruleType,
      definition: data.definition as unknown as Prisma.InputJsonValue,
      severity: data.severity,
      createdBy: actor,
    },
  });
  return toRuleDto(row, 0);
}

export async function updateRule(
  ruleId: number,
  data: {
    ruleType: DetectionRuleType;
    definition: DetectionRuleDefinition;
    severity: DetectionRuleSeverity;
    version: number;
  },
): Promise<DetectionRuleDto> {
  const row = await prisma.rulDetectionRule.update({
    where: { ruleId },
    data: {
      ruleType: data.ruleType,
      definition: data.definition as unknown as Prisma.InputJsonValue,
      severity: data.severity,
      version: data.version,
    },
  });
  return toRuleDto(row, await countOpenFindings(ruleId));
}

export interface RetiredFinding {
  findingId: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/**
 * Sets rul_active. Turning a rule off also closes its open findings as 'rule_retired' in the
 * same transaction: the rules run skips inactive rules, so nothing else would ever close them.
 */
export async function setRuleActive(
  ruleId: number,
  active: boolean,
  actor: string,
): Promise<{ rule: DetectionRuleDto; retired: RetiredFinding[] }> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.rulDetectionRule.update({ where: { ruleId }, data: { active } });
    if (active) {
      const openFindingCount = await tx.fndFinding.count({
        where: { ruleId, status: { in: LIVE_FINDING_STATUSES } },
      });
      return { rule: toRuleDto(row, openFindingCount), retired: [] };
    }

    const openFindings = await tx.fndFinding.findMany({
      where: { ruleId, status: { in: LIVE_FINDING_STATUSES } },
    });
    const retired: RetiredFinding[] = [];
    const resolvedAt = new Date();

    for (const finding of openFindings) {
      const after = await tx.fndFinding.update({
        where: { findingId: finding.findingId },
        data: {
          status: RULE_RETIRED_STATUS,
          resolvedAt,
          resolvedBy: actor,
          resolution: RULE_RETIRED_RESOLUTION,
        },
      });
      retired.push({ findingId: finding.findingId, before: serialize(finding), after: serialize(after) });
    }

    return { rule: toRuleDto(row, 0), retired };
  });
}
