import { describe, it, expect, vi } from 'vitest';
import { instantiateSwapExceptionAuthorizationWorkflow } from './InstantiateSwapExceptionAuthorizationWorkflow';
import { prisma } from '../../../db/prisma';
import { workflowInstantiationOrchestrator } from '../../workflow/WorkflowInstantiationOrchestrator';

vi.mock('../../../db/prisma', () => ({
  prisma: {
    wflWorkflowTemplate: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../workflow/WorkflowInstantiationOrchestrator', () => ({
  workflowInstantiationOrchestrator: {
    instantiate: vi.fn(),
  },
}));

describe('instantiateSwapExceptionAuthorizationWorkflow', () => {
  it('returns false when no published template exists', async () => {
    (prisma.wflWorkflowTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await instantiateSwapExceptionAuthorizationWorkflow({
      holidaySwapId: 42,
      requestedByUserId: 7,
      requestedByEmail: 'user@example.com',
    });

    expect(result).toBe(false);
    expect(workflowInstantiationOrchestrator.instantiate).not.toHaveBeenCalled();
  });

  it('instantiates the workflow when a published template exists', async () => {
    (prisma.wflWorkflowTemplate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ wflId: 'wfl-123' });
    (workflowInstantiationOrchestrator.instantiate as ReturnType<typeof vi.fn>).mockResolvedValue({
      winId: 'win-1',
      activatedTaskIds: [],
    });

    const result = await instantiateSwapExceptionAuthorizationWorkflow({
      holidaySwapId: 42,
      requestedByUserId: 7,
      requestedByEmail: 'user@example.com',
    });

    expect(result).toBe(true);
    expect(workflowInstantiationOrchestrator.instantiate).toHaveBeenCalledWith({
      wflId: 'wfl-123',
      winName: 'Holiday swap exception authorization — swap #42',
      businessReferenceType: 'HolidaySwap',
      businessReferenceId: '42',
      ownerUserId: 7,
      startedBy: 'user@example.com',
      createdBy: '7',
    });
  });
});
