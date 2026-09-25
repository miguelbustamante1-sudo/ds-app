import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processSlaBreaches } from './SlaBreachScanner';

const findMany = vi.fn();
const transaction = vi.fn((cb: (tx: unknown) => unknown) => cb({}));
const escalateTask = vi.fn();
const processMissedTask = vi.fn();
const auditLog = vi.fn();

vi.mock('../../../db/prisma', () => ({
  prisma: {
    witWorkflowInstanceTask: { findMany: (...args: unknown[]) => findMany(...args) },
    $transaction: (cb: (tx: unknown) => unknown) => transaction(cb),
  },
}));
vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: (...args: unknown[]) => auditLog(...args) },
}));
vi.mock('./EscalateTask', () => ({
  escalateTask: (...args: unknown[]) => escalateTask(...args),
}));
vi.mock('../MissedTaskOrchestrator', () => ({
  processMissedTask: (...args: unknown[]) => processMissedTask(...args),
}));

describe('processSlaBreaches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls escalateTask for a task with deadlineAction ESCALATE', async () => {
    findMany.mockResolvedValue([{ witId: 'wit-1', templateTask: { deadlineAction: 'ESCALATE' } }]);

    await processSlaBreaches();

    expect(escalateTask).toHaveBeenCalledWith(expect.anything(), 'wit-1');
    expect(processMissedTask).not.toHaveBeenCalled();
  });

  it('calls processMissedTask for a task with deadlineAction MISSED_AND_RECREATE', async () => {
    findMany.mockResolvedValue([{ witId: 'wit-2', templateTask: { deadlineAction: 'MISSED_AND_RECREATE' } }]);

    await processSlaBreaches();

    expect(processMissedTask).toHaveBeenCalledWith('wit-2');
    expect(escalateTask).not.toHaveBeenCalled();
  });

  it('defaults a task with no templateTask link to ESCALATE', async () => {
    findMany.mockResolvedValue([{ witId: 'wit-3', templateTask: null }]);

    await processSlaBreaches();

    expect(escalateTask).toHaveBeenCalledWith(expect.anything(), 'wit-3');
  });

  it('continues processing remaining tasks if one throws', async () => {
    findMany.mockResolvedValue([
      { witId: 'wit-4', templateTask: { deadlineAction: 'MISSED_AND_RECREATE' } },
      { witId: 'wit-5', templateTask: { deadlineAction: 'ESCALATE' } },
    ]);
    processMissedTask.mockRejectedValueOnce(new Error('boom'));

    await processSlaBreaches();

    expect(escalateTask).toHaveBeenCalledWith(expect.anything(), 'wit-5');
  });
});
