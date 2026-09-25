import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMissedTask } from './MissedTaskOrchestrator';

const transaction = vi.fn((cb: (tx: unknown) => unknown) => cb({}));

vi.mock('../../db/prisma', () => ({
  prisma: { $transaction: (cb: (tx: unknown) => unknown) => transaction(cb) },
}));

vi.mock('./components/ResolveTaskAsMissed', () => ({
  resolveTaskAsMissed: vi.fn(),
}));
vi.mock('./components/EscalateTask', () => ({
  escalateTask: vi.fn(),
}));
vi.mock('./components/CreateReplacementTask', () => ({
  createReplacementTask: vi.fn(),
}));
vi.mock('./components/NotificationDispatcher', () => ({
  notifyWorkflowEvent: vi.fn(),
}));

import { resolveTaskAsMissed } from './components/ResolveTaskAsMissed';
import { escalateTask } from './components/EscalateTask';
import { createReplacementTask } from './components/CreateReplacementTask';

describe('processMissedTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing further if resolveTaskAsMissed reports it was not resolved', async () => {
    (resolveTaskAsMissed as ReturnType<typeof vi.fn>).mockResolvedValue({ resolved: false });

    await processMissedTask('wit-1');

    expect(escalateTask).not.toHaveBeenCalled();
    expect(createReplacementTask).not.toHaveBeenCalled();
  });
});
