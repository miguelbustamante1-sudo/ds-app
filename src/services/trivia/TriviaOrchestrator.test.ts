import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pullNewBatch } from './TriviaOrchestrator';
import { prisma } from '../../db/prisma';
import * as GenerateTriviaBatchModule from './components/GenerateTriviaBatch';
import { auditOrchestrator } from '../audit/AuditOrchestrator';

vi.mock('../../db/prisma', () => ({
  prisma: {
    triviaBatch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    triviaQuestion: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

describe('pullNewBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws AppError(409) when a batch is already pending', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, status: 'pending' });

    await expect(pullNewBatch(7, 'admin@example.com')).rejects.toThrow('A trivia batch is already in progress');
  });

  it('creates a pending batch row and returns its id immediately', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.triviaBatch.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42, status: 'pending' });
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(GenerateTriviaBatchModule, 'generateTriviaBatch').mockResolvedValue([]);

    const result = await pullNewBatch(7, 'admin@example.com');

    expect(result).toEqual({ batchId: 42 });
    expect(prisma.triviaBatch.create).toHaveBeenCalledWith({
      data: { status: 'pending', requestedQuestionCount: 30, createdBy: 7 },
    });
  });

  it('inserts deduped questions, audit-logs each, and marks the batch completed', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.triviaBatch.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42, status: 'pending' });
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // existing questionText sample
      .mockResolvedValueOnce([]); // existing questionHash set
    vi.spyOn(GenerateTriviaBatchModule, 'generateTriviaBatch').mockResolvedValue([
      { questionText: 'Q1', option1: 'A', option2: 'B', option3: 'C', option4: 'D', correctOptionIndex: 0 },
    ]);
    (prisma.triviaQuestion.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, questionText: 'Q1' });

    await pullNewBatch(7, 'admin@example.com');
    await vi.waitFor(() => expect(prisma.triviaBatch.update).toHaveBeenCalled());

    expect(prisma.triviaQuestion.create).toHaveBeenCalledTimes(1);
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'trq_trivia_questions', createdBy: 'admin@example.com' }),
    );
    expect(prisma.triviaBatch.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: expect.objectContaining({ status: 'completed', insertedQuestionCount: 1 }),
    });
  });

  it('marks the batch failed when generation throws', async () => {
    (prisma.triviaBatch.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.triviaBatch.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42, status: 'pending' });
    (prisma.triviaQuestion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(GenerateTriviaBatchModule, 'generateTriviaBatch').mockRejectedValue(new Error('Fuel iX down'));

    await pullNewBatch(7, 'admin@example.com');
    await vi.waitFor(() => expect(prisma.triviaBatch.update).toHaveBeenCalled());

    expect(prisma.triviaBatch.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: expect.objectContaining({ status: 'failed' }),
    });
  });
});
