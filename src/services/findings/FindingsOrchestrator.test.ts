// src/services/findings/FindingsOrchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../detection-rules/repository', () => ({
  listActiveEntityTypes: vi.fn(),
}));
vi.mock('./repository', () => ({
  countApprovedStates: vi.fn(),
  countSnapshots: vi.fn(),
  startRunLog: vi.fn(),
  completeRunLog: vi.fn(),
  failRunLog: vi.fn(),
  getActiveWatchedFields: vi.fn(),
  getSnapshots: vi.fn(),
  getApprovedStates: vi.fn(),
  getOpenFindingRefs: vi.fn(),
  getFindings: vi.fn(),
  getStatusCounts: vi.fn(),
  runStateRules: vi.fn(),
}));
vi.mock('./components/ApplyFindingsPlan', () => ({
  applyFindingsPlan: vi.fn(),
}));
vi.mock('./components/RecordObservations', () => ({
  buildObservations: vi.fn(() => []),
  recordObservations: vi.fn(),
}));
vi.mock('./components/SyncFindingTasks', () => ({
  syncFindingTasks: vi.fn(),
}));
vi.mock('../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

import { FindingsOrchestrator } from './FindingsOrchestrator';
import { listActiveEntityTypes } from '../detection-rules/repository';
import {
  completeRunLog,
  countApprovedStates,
  countSnapshots,
  failRunLog,
  getActiveWatchedFields,
  getApprovedStates,
  getFindings,
  getOpenFindingRefs,
  getSnapshots,
  getStatusCounts,
  startRunLog,
} from './repository';
import { applyFindingsPlan } from './components/ApplyFindingsPlan';
import { recordObservations } from './components/RecordObservations';
import { syncFindingTasks } from './components/SyncFindingTasks';

const orchestrator = new FindingsOrchestrator();

function mockHealthyPipeline() {
  let nextRunLogId = 100;
  vi.mocked(countApprovedStates).mockResolvedValue(1);
  vi.mocked(countSnapshots).mockResolvedValue(1);
  vi.mocked(startRunLog).mockImplementation(async () => ({ runLogId: nextRunLogId++ }) as never);
  vi.mocked(completeRunLog).mockImplementation(async (runLogId) => ({ runLogId, status: 'completed' }) as never);
  vi.mocked(getActiveWatchedFields).mockResolvedValue([{ fieldPath: 'Name', displayName: 'Name' }]);
  vi.mocked(getSnapshots).mockResolvedValue({ r1: { Name: 'a' } });
  vi.mocked(getApprovedStates).mockResolvedValue({ r1: { Name: 'a' } });
  vi.mocked(getOpenFindingRefs).mockResolvedValue([]);
  vi.mocked(applyFindingsPlan).mockResolvedValue({
    result: { opened: 0, recurred: 0, resolved: 0, superseded: 0 },
    mutations: [],
  });
  vi.mocked(recordObservations).mockResolvedValue(0);
  vi.mocked(syncFindingTasks).mockResolvedValue({ tasksCreated: 0, tasksClosed: 0, taskSyncError: null });
}

describe('FindingsOrchestrator.runFindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthyPipeline();
  });

  it('runs every active entity type with its own run log, then syncs tasks once', async () => {
    vi.mocked(listActiveEntityTypes).mockResolvedValue(['assignment', 'pse__proj__c']);

    const result = await orchestrator.runFindings('me@example.com');

    expect(vi.mocked(startRunLog).mock.calls.map((c) => c[0])).toEqual(['assignment', 'pse__proj__c']);
    expect(result.entities.map((e) => [e.entityType, e.status, e.runLogId])).toEqual([
      ['assignment', 'completed', 100],
      ['pse__proj__c', 'completed', 101],
    ]);
    expect(syncFindingTasks).toHaveBeenCalledTimes(1);
  });

  it('reports a failing entity in its own entry and still runs the others', async () => {
    vi.mocked(listActiveEntityTypes).mockResolvedValue(['assignment', 'pse__proj__c']);
    vi.mocked(getSnapshots).mockImplementation(async (entityType) => {
      if (entityType === 'assignment') throw new Error('snapshot load failed');
      return { r1: { Name: 'a' } };
    });

    const result = await orchestrator.runFindings('me@example.com');

    expect(result.entities[0]).toMatchObject({
      entityType: 'assignment',
      status: 'failed',
      runLogId: 100,
      error: 'snapshot load failed',
    });
    expect(failRunLog).toHaveBeenCalledWith(100, 'snapshot load failed');
    expect(result.entities[1]).toMatchObject({ entityType: 'pse__proj__c', status: 'completed', runLogId: 101 });
    expect(syncFindingTasks).toHaveBeenCalledTimes(1);
  });

  it('reports a null run log when the run log could not be started', async () => {
    vi.mocked(listActiveEntityTypes).mockResolvedValue(['pse__proj__c']);
    vi.mocked(startRunLog).mockRejectedValue(new Error('db down'));

    const result = await orchestrator.runFindings('me@example.com');

    expect(result.entities).toEqual([
      expect.objectContaining({ entityType: 'pse__proj__c', status: 'failed', runLogId: null, error: 'db down' }),
    ]);
  });

  it('returns no entries when no entity type is active', async () => {
    vi.mocked(listActiveEntityTypes).mockResolvedValue([]);

    const result = await orchestrator.runFindings('me@example.com');

    expect(result.entities).toEqual([]);
    expect(startRunLog).not.toHaveBeenCalled();
  });
});

describe('FindingsOrchestrator read filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('spans every active entity type when no entityType is given', async () => {
    vi.mocked(listActiveEntityTypes).mockResolvedValue(['assignment', 'pse__proj__c']);

    await orchestrator.getFindings({ status: 'open' });
    await orchestrator.getStatusCounts();

    expect(getFindings).toHaveBeenCalledWith(['assignment', 'pse__proj__c'], 'open');
    expect(getStatusCounts).toHaveBeenCalledWith(['assignment', 'pse__proj__c']);
  });

  it('narrows to one entity type when given, without looking up active ones', async () => {
    await orchestrator.getFindings({ entityType: 'pse__proj__c' });
    await orchestrator.getStatusCounts('pse__proj__c');

    expect(getFindings).toHaveBeenCalledWith(['pse__proj__c'], undefined);
    expect(getStatusCounts).toHaveBeenCalledWith(['pse__proj__c']);
    expect(listActiveEntityTypes).not.toHaveBeenCalled();
  });
});
