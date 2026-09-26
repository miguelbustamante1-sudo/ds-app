import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escalateTask } from './EscalateTask';

const findUnique = vi.fn();
const update = vi.fn();
const userFindFirst = vi.fn();
const walCreate = vi.fn();
const notify = vi.fn();

vi.mock('./NotificationDispatcher', () => ({
  notifyWorkflowEvent: (...args: unknown[]) => notify(...args),
}));
vi.mock('../queries/getUsersByRoleName', () => ({
  getUsersByRoleName: vi.fn().mockResolvedValue([]),
}));
vi.mock('./ResolveFirstSupervisorUserId', () => ({
  resolveFirstSupervisorUserId: vi.fn().mockResolvedValue(null),
}));

function makeTx() {
  return {
    witWorkflowInstanceTask: { findUnique, update },
    user: { findFirst: userFindFirst },
    walWorkflowAuditLog: { create: walCreate },
  } as never;
}

describe('escalateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing if the task no longer exists', async () => {
    findUnique.mockResolvedValue(null);
    await escalateTask(makeTx(), 'wit-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('is a no-op if already escalated', async () => {
    findUnique.mockResolvedValue({ witId: 'wit-1', escalatedAt: new Date() });
    await escalateTask(makeTx(), 'wit-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('notifies an active escalationUserId', async () => {
    findUnique.mockResolvedValue({
      witId: 'wit-1',
      winId: 'win-1',
      escalatedAt: null,
      escalationUserId: 7,
      escalationRoleId: null,
      escalationDynamicType: null,
      resolvedUserId: null,
    });
    userFindFirst.mockResolvedValue({ userId: 7 });

    await escalateTask(makeTx(), 'wit-1');

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserIds: ['7'] }),
    );
  });

  it('does NOT notify an inactive escalationUserId, and records NO_RESPONSIBLE_FOUND', async () => {
    findUnique.mockResolvedValue({
      witId: 'wit-1',
      winId: 'win-1',
      escalatedAt: null,
      escalationUserId: 7,
      escalationRoleId: null,
      escalationDynamicType: null,
      resolvedUserId: null,
    });
    userFindFirst.mockResolvedValue(null); // active-status filter excluded them

    await escalateTask(makeTx(), 'wit-1');

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserIds: [] }),
    );
    expect(walCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'NO_RESPONSIBLE_FOUND' }) }),
    );
  });
});
