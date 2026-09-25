// src/services/detection-rules/DetectionRulesOrchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DetectionRuleDto } from '@shared/dto';

vi.mock('./repository', () => ({
  entityTypeExists: vi.fn().mockResolvedValue(true),
  findActiveRulesOnField: vi.fn(),
  createRule: vi.fn(async (data) => ({ ...baseRule, ruleId: 99, ...data })),
  getRule: vi.fn(),
  updateRule: vi.fn(async (ruleId, data) => ({ ...baseRule, ruleId, ...data })),
  listRules: vi.fn(),
  listActiveEntityTypes: vi.fn(),
  setRuleActive: vi.fn(),
}));
vi.mock('../audit/AuditOrchestrator', () => ({ auditOrchestrator: { log: vi.fn() } }));
vi.mock('../findings/components/SyncFindingTasks', () => ({ closeFindingTasks: vi.fn() }));

const baseRule: DetectionRuleDto = {
  ruleId: 1,
  entityType: 'project',
  ruleClass: 'state',
  ruleType: 'required_when',
  definition: { field: 'director', when: { field: 'project_type', operator: 'equals', value: 'A' } },
  severity: 'medium',
  version: 1,
  active: true,
  createdAt: '2026-09-25T00:00:00.000Z',
  createdBy: 'test',
  openFindingCount: 0,
};

import { DetectionRulesOrchestrator } from './DetectionRulesOrchestrator';
import { findActiveRulesOnField, getRule } from './repository';

const orchestrator = new DetectionRulesOrchestrator();
const whenValue = (value: string) => ({ field: 'project_type', operator: 'equals' as const, value });

describe('DetectionRulesOrchestrator duplicate check', () => {
  beforeEach(() => vi.mocked(findActiveRulesOnField).mockResolvedValue([baseRule]));

  it('allows a second required_when on the same field with a different condition value', async () => {
    const created = await orchestrator.createRule(
      { entityType: 'project', ruleType: 'required_when', severity: 'medium', definition: { field: 'director', when: whenValue('B') } },
      'me@example.com',
    );
    expect(created.ruleId).toBe(99);
  });

  it('rejects an identical required_when', async () => {
    await expect(
      orchestrator.createRule(
        { entityType: 'project', ruleType: 'required_when', severity: 'medium', definition: { field: 'director', when: whenValue('A') } },
        'me@example.com',
      ),
    ).rejects.toThrow('with condition project_type equals "A"');
  });

  it('still allows only one plain rule per type and field', async () => {
    vi.mocked(findActiveRulesOnField).mockResolvedValue([{ ...baseRule, ruleType: 'required_not_null', definition: { field: 'director' } }]);
    await expect(
      orchestrator.createRule(
        { entityType: 'project', ruleType: 'required_not_null', severity: 'medium', definition: { field: 'director' } },
        'me@example.com',
      ),
    ).rejects.toThrow('already exists');
  });

  it('rejects an edit that would make a rule identical to another active one', async () => {
    vi.mocked(getRule).mockResolvedValue({ ...baseRule, ruleId: 2, definition: { field: 'director', when: whenValue('B') } });
    await expect(
      orchestrator.updateRule(2, { definition: { field: 'director', when: whenValue('A') } }, 'me@example.com'),
    ).rejects.toThrow('already exists');
  });

  it('does not count the rule being edited as its own duplicate', async () => {
    vi.mocked(getRule).mockResolvedValue(baseRule);
    const updated = await orchestrator.updateRule(1, { definition: { field: 'director', when: whenValue('A2') } }, 'me@example.com');
    expect(updated.version).toBe(2);
  });
});
