import type {
  CreateDetectionRuleDto,
  DetectionRuleDto,
  SetDetectionRuleActiveResultDto,
  UpdateDetectionRuleDto,
} from '@shared/dto';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import {
  createRule,
  entityTypeExists,
  findActiveRuleOnField,
  getRule,
  listActiveEntityTypes,
  listRules,
  setRuleActive,
  updateRule,
} from './repository';
import {
  assertRuleType,
  assertSeverity,
  normalizeRuleDefinition,
  sameDefinition,
} from './components/NormalizeRuleDefinition';
import {
  DetectionRuleNotFoundError,
  DetectionRuleValidationError,
  DuplicateDetectionRuleError,
} from './errors';

const RULE_TABLE = 'rul_detection_rules';
const FINDING_TABLE = 'fnd_findings';

function snapshot(dto: DetectionRuleDto): Record<string, unknown> {
  // openFindingCount is derived, not a column of the row being audited.
  const { openFindingCount: _derived, ...row } = dto;
  return row as unknown as Record<string, unknown>;
}

function describe(rule: DetectionRuleDto): string {
  return `${rule.ruleType} on ${rule.entityType}.${rule.definition.field}`;
}

export class DetectionRulesOrchestrator {
  async getRules(): Promise<DetectionRuleDto[]> {
    return listRules();
  }

  async getEntityTypes(): Promise<string[]> {
    return listActiveEntityTypes();
  }

  async createRule(payload: CreateDetectionRuleDto, actor: string): Promise<DetectionRuleDto> {
    const entityType = payload.entityType?.trim();
    if (!entityType) throw new DetectionRuleValidationError('Entity type is required');
    if (!(await entityTypeExists(entityType))) {
      throw new DetectionRuleValidationError(`Watched entity "${entityType}" not found`);
    }

    const ruleType = assertRuleType(payload.ruleType);
    const severity = assertSeverity(payload.severity);
    const definition = normalizeRuleDefinition(ruleType, payload.definition);

    if (await findActiveRuleOnField(entityType, ruleType, definition.field)) {
      throw new DuplicateDetectionRuleError(entityType, ruleType, definition.field);
    }

    const created = await createRule({ entityType, ruleType, definition, severity }, actor);

    await auditOrchestrator.log({
      entityName: RULE_TABLE,
      entityId: String(created.ruleId),
      createdBy: actor,
      oldValues: null,
      newValues: snapshot(created),
      comment: `Detection rule created: ${describe(created)}`,
    });

    return created;
  }

  async updateRule(ruleId: number, payload: UpdateDetectionRuleDto, actor: string): Promise<DetectionRuleDto> {
    const existing = await getRule(ruleId);
    if (!existing) throw new DetectionRuleNotFoundError(ruleId);

    const field = existing.definition.field;
    if (payload.definition?.field !== undefined && payload.definition.field.trim() !== field) {
      throw new DetectionRuleValidationError(
        'Field cannot change: open findings are keyed by field. Turn this rule off and create a new one.',
      );
    }

    const ruleType = assertRuleType(payload.ruleType ?? existing.ruleType);
    const severity = assertSeverity(payload.severity ?? existing.severity);
    const definition = normalizeRuleDefinition(ruleType, { ...(payload.definition ?? existing.definition), field });

    // Findings record the rul_version that raised them, so any change to what the rule checks bumps it.
    const logicChanged = ruleType !== existing.ruleType || !sameDefinition(definition, existing.definition);
    const version = logicChanged ? existing.version + 1 : existing.version;

    const updated = await updateRule(ruleId, { ruleType, definition, severity, version });

    await auditOrchestrator.log({
      entityName: RULE_TABLE,
      entityId: String(ruleId),
      createdBy: actor,
      oldValues: snapshot(existing),
      newValues: snapshot(updated),
      comment: `Detection rule updated: ${describe(updated)}${logicChanged ? ` (v${version})` : ''}`,
    });

    return updated;
  }

  async setRuleActive(ruleId: number, active: boolean, actor: string): Promise<SetDetectionRuleActiveResultDto> {
    const existing = await getRule(ruleId);
    if (!existing) throw new DetectionRuleNotFoundError(ruleId);

    const { rule, retired } = await setRuleActive(ruleId, active, actor);

    await auditOrchestrator.log({
      entityName: RULE_TABLE,
      entityId: String(ruleId),
      createdBy: actor,
      oldValues: snapshot(existing),
      newValues: snapshot(rule),
      comment: `Detection rule ${active ? 'activated' : 'deactivated'}: ${describe(rule)}`,
    });

    for (const finding of retired) {
      await auditOrchestrator.log({
        entityName: FINDING_TABLE,
        entityId: String(finding.findingId),
        createdBy: actor,
        oldValues: finding.before,
        newValues: finding.after,
        comment: `Finding retired: detection rule ${ruleId} deactivated`,
      });
    }

    return { rule, findingsRetired: retired.length };
  }
}

export const detectionRulesOrchestrator = new DetectionRulesOrchestrator();
