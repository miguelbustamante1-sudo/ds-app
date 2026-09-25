// src/services/findings/components/SyncFindingTasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repository', () => ({
  createFindingTasks: vi.fn(),
  closeResolvedFindingTasks: vi.fn(),
}));
vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

import { syncFindingTasks } from './SyncFindingTasks';
import { closeResolvedFindingTasks, createFindingTasks } from '../repository';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

describe('syncFindingTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports counts and audits each non-empty batch', async () => {
    vi.mocked(createFindingTasks).mockResolvedValue([
      { fnd_id: 1, win_id: 'a' },
      { fnd_id: 2, win_id: 'b' },
    ]);
    vi.mocked(closeResolvedFindingTasks).mockResolvedValue([
      { fnd_id: 3, win_id: 'c', wit_id: 'x', finding_status: 'self_resolved' },
    ]);

    const result = await syncFindingTasks('me@example.com');

    expect(result).toEqual({ tasksCreated: 2, tasksClosed: 1, taskSyncError: null });
    expect(auditOrchestrator.log).toHaveBeenCalledTimes(2);
  });

  it('writes no audit entry when nothing changed', async () => {
    vi.mocked(createFindingTasks).mockResolvedValue([]);
    vi.mocked(closeResolvedFindingTasks).mockResolvedValue([]);

    await syncFindingTasks('me@example.com');

    expect(auditOrchestrator.log).not.toHaveBeenCalled();
  });

  it('never throws: a workflow failure comes back as taskSyncError', async () => {
    vi.mocked(createFindingTasks).mockRejectedValue(new Error('function ds.fn_create_finding_tasks() does not exist'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await syncFindingTasks('me@example.com');

    expect(result).toEqual({
      tasksCreated: 0,
      tasksClosed: 0,
      taskSyncError: 'function ds.fn_create_finding_tasks() does not exist',
    });
  });
});
