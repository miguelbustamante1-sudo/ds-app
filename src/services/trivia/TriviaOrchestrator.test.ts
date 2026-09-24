import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pullNewBatch, updateQuestion, deleteQuestion } from './TriviaOrchestrator';
import { prisma } from '../../db/prisma';
import * as GenerateTriviaBatchModule from './components/GenerateTriviaBatch';
import { auditOrchestrator } from '../audit/AuditOrchestrator';

vi.mock('../../db/prisma', () => ({
  prisma: {
    triviaBatch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    triviaQuestion: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
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

describe('updateQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws AppError(404) when the question does not exist', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(updateQuestion(1, { isActive: false }, 7, 'admin@example.com')).rejects.toThrow(
      'Trivia question not found',
    );
  });

  it('updates isActive, audit-logs the change, and returns the updated row', async () => {
    const before = { id: 1, isActive: true };
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(before);
    (prisma.triviaQuestion.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, isActive: false });

    const result = await updateQuestion(1, { isActive: false }, 7, 'admin@example.com');

    expect(prisma.triviaQuestion.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isActive: false } });
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'trq_trivia_questions',
        entityId: '1',
        createdBy: 'admin@example.com',
        oldValues: before,
      }),
    );
    expect(result).toEqual({ id: 1, isActive: false });
  });
});

describe('deleteQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws AppError(404) when the question does not exist', async () => {
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(deleteQuestion(1, 'admin@example.com')).rejects.toThrow('Trivia question not found');
  });

  it('deletes the question and audit-logs it with newValues null', async () => {
    const existing = { id: 1, questionText: 'Q1' };
    (prisma.triviaQuestion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (prisma.triviaQuestion.delete as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await deleteQuestion(1, 'admin@example.com');

    expect(prisma.triviaQuestion.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(auditOrchestrator.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'trq_trivia_questions', entityId: '1', newValues: null }),
    );
  });
});
