import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReplacementTask } from './CreateReplacementTask';

const create = vi.fn();
const update = vi.fn();
const wtaCreate = vi.fn();
const walCreate = vi.fn();
const auditLog = vi.fn();

vi.mock('../../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: (...args: unknown[]) => auditLog(...args) },
}));

vi.mock('./ResolveTaskResponsible', () => ({
  resolveTaskResponsible: vi.fn().mockResolvedValue({
    resolvedUserId: 42,
    noResponsibleFound: false,
    roleCandidateUserIds: [],
    roleName: null,
  }),
}));

function makeTx() {
  return {
    witWorkflowInstanceTask: { create, update },
    wtaWorkflowTaskAssignee: { create: wtaCreate },
    walWorkflowAuditLog: { create: walCreate },
  } as never;
}

const baseMissedTask = {
  witId: 'wit-1',
  winId: 'win-1',
  wtkId: 'wtk-1',
  code: 'REVIEW',
  name: 'Review',
  description: null,
  sequenceNo: 1,
  taskType: 'MANUAL',
  assignmentType: 'USER',
  assignedUserId: 42,
  assignedRoleId: null,
  dynamicAssignmentType: null,
  priority: 'MEDIUM',
  slaDurationHours: 8,
  maxRetryCount: 0,
  escalationUserId: null,
  escalationRoleId: null,
  escalationDynamicType: null,
  attemptNumber: 1,
  remainingReplacements: 2,
  originalTaskId: null,
};

describe('createReplacementTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ witId: 'wit-2' });
  });

  it('creates a replacement with halved duration and decremented remainingReplacements', async () => {
    await createReplacementTask(makeTx(), {
      missedTask: baseMissedTask,
      reductionPercentage: 0.5,
      shift: null,
      ownerUserId: null,
      businessReferenceType: null,
      businessReferenceId: null,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: 'ACTIVE',
          slaDurationHours: 4,
          previousTaskId: 'wit-1',
          originalTaskId: 'wit-1',
          attemptNumber: 2,
          remainingReplacements: 1,
        }),
      }),
    );
  });

  it('propagates an existing originalTaskId instead of re-pointing to the missed task itself', async () => {
    await createReplacementTask(makeTx(), {
      missedTask: { ...baseMissedTask, attemptNumber: 2, originalTaskId: 'wit-0', remainingReplacements: 1 },
      reductionPercentage: 0.5,
      shift: null,
      ownerUserId: null,
      businessReferenceType: null,
      businessReferenceId: null,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalTaskId: 'wit-0', attemptNumber: 3 }),
      }),
    );
  });

  it('writes both audit trails for the new replacement', async () => {
    await createReplacementTask(makeTx(), {
      missedTask: baseMissedTask,
      reductionPercentage: 0.5,
      shift: null,
      ownerUserId: null,
      businessReferenceType: null,
      businessReferenceId: null,
    });

    expect(walCreate).toHaveBeenCalledOnce();
    expect(auditLog).toHaveBeenCalledOnce();
  });
});
