import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDeadlineAction } from './ValidateDeadlineAction';
import {
  WorkflowDeadlineActionReductionPercentageError,
  WorkflowDeadlineActionReplacementLimitError,
  WorkflowDeadlineActionEscalationTargetError,
} from '../errors';

const findMany = vi.fn();

vi.mock('../../../db/prisma', () => ({
  prisma: { wtkWorkflowTemplateTask: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

const baseTask = {
  code: 'REVIEW',
  deadlineAction: 'MISSED_AND_RECREATE',
  reductionPercentage: 0.5,
  replacementLimit: 2,
  escalationUserId: 7,
  escalationRoleId: null,
  escalationDynamicType: null,
};

describe('validateDeadlineAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes for a fully-configured MISSED_AND_RECREATE task', async () => {
    findMany.mockResolvedValue([baseTask]);
    await expect(validateDeadlineAction('wfl-1')).resolves.toBeUndefined();
  });

  it('skips ESCALATE tasks entirely, even with no escalation target', async () => {
    findMany.mockResolvedValue([{ ...baseTask, deadlineAction: 'ESCALATE', escalationUserId: null }]);
    await expect(validateDeadlineAction('wfl-1')).resolves.toBeUndefined();
  });

  it('throws when reductionPercentage is missing', async () => {
    findMany.mockResolvedValue([{ ...baseTask, reductionPercentage: null }]);
    await expect(validateDeadlineAction('wfl-1')).rejects.toThrow(WorkflowDeadlineActionReductionPercentageError);
  });

  it('throws when reductionPercentage is out of range', async () => {
    findMany.mockResolvedValue([{ ...baseTask, reductionPercentage: 1.5 }]);
    await expect(validateDeadlineAction('wfl-1')).rejects.toThrow(WorkflowDeadlineActionReductionPercentageError);
  });

  it('throws when replacementLimit is missing', async () => {
    findMany.mockResolvedValue([{ ...baseTask, replacementLimit: null }]);
    await expect(validateDeadlineAction('wfl-1')).rejects.toThrow(WorkflowDeadlineActionReplacementLimitError);
  });

  it('throws when replacementLimit is negative', async () => {
    findMany.mockResolvedValue([{ ...baseTask, replacementLimit: -1 }]);
    await expect(validateDeadlineAction('wfl-1')).rejects.toThrow(WorkflowDeadlineActionReplacementLimitError);
  });

  it('throws when no escalation target is configured', async () => {
    findMany.mockResolvedValue([
      { ...baseTask, escalationUserId: null, escalationRoleId: null, escalationDynamicType: null },
    ]);
    await expect(validateDeadlineAction('wfl-1')).rejects.toThrow(WorkflowDeadlineActionEscalationTargetError);
  });
});
