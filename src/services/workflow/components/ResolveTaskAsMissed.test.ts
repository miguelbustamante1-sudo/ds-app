import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTaskAsMissed } from './ResolveTaskAsMissed';

const findUnique = vi.fn();
const updateMany = vi.fn();
const findUniqueOrThrow = vi.fn();
const walCreate = vi.fn();
const auditLog = vi.fn();

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: (...args: unknown[]) => auditLog(...args) },
}));

function makeTx() {
  return {
    witWorkflowInstanceTask: { findUnique, updateMany, findUniqueOrThrow },
    walWorkflowAuditLog: { create: walCreate },
  } as never;
}

describe('resolveTaskAsMissed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not resolved when the task does not exist', async () => {
    findUnique.mockResolvedValue(null);
    const result = await resolveTaskAsMissed(makeTx(), 'wit-1');
    expect(result.resolved).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('resolves the task as MISSED and writes both audit trails when the guard wins', async () => {
    findUnique.mockResolvedValue({ witId: 'wit-1' });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      witId: 'wit-1',
      winId: 'win-1',
      dueAt: new Date('2026-09-25T12:00:00Z'),
      attemptNumber: 1,
      remainingReplacements: 2,
    });

    const result = await resolveTaskAsMissed(makeTx(), 'wit-1');

    expect(result.resolved).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { witId: 'wit-1', state: 'ACTIVE' },
      data: expect.objectContaining({ state: 'MISSED' }),
    });
    expect(walCreate).toHaveBeenCalledOnce();
    expect(auditLog).toHaveBeenCalledOnce();
  });

  it('returns not resolved when another scanner tick already won the race (count !== 1)', async () => {
    findUnique.mockResolvedValue({ witId: 'wit-1' });
    updateMany.mockResolvedValue({ count: 0 });

    const result = await resolveTaskAsMissed(makeTx(), 'wit-1');

    expect(result.resolved).toBe(false);
    expect(walCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});
