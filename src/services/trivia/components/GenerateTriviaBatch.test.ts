import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTriviaBatch, parseTriviaBatchResponse } from './GenerateTriviaBatch';
import * as FuelixCopilotClient from '../../sop/FuelixCopilotClient';

describe('parseTriviaBatchResponse', () => {
  it('parses a valid bare JSON array', () => {
    const raw = JSON.stringify([
      { question: 'What is the PTO policy?', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1 },
    ]);

    const result = parseTriviaBatchResponse(raw);

    expect(result).toEqual([
      { questionText: 'What is the PTO policy?', option1: 'A', option2: 'B', option3: 'C', option4: 'D', correctOptionIndex: 1 },
    ]);
  });

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify([
      { question: 'What is the PTO policy?', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
    ]) + '\n```';

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(1);
  });

  it('drops entries with the wrong number of options, keeps valid ones', () => {
    const raw = JSON.stringify([
      { question: 'Bad question', options: ['A', 'B'], correctOptionIndex: 0 },
      { question: 'Good question', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 },
    ]);

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(1);
    expect(result[0]?.questionText).toBe('Good question');
  });

  it('throws AppError(502) when the response is not valid JSON', () => {
    expect(() => parseTriviaBatchResponse('not json')).toThrow('Fuel iX returned invalid trivia JSON');
  });

  it('throws AppError(502) when every entry is invalid', () => {
    const raw = JSON.stringify([{ question: '', options: [], correctOptionIndex: -1 }]);

    expect(() => parseTriviaBatchResponse(raw)).toThrow('Fuel iX returned no valid trivia questions');
  });
});

describe('generateTriviaBatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('polls until completion then parses the assistant message', async () => {
    vi.spyOn(FuelixCopilotClient, 'createThreadRun').mockResolvedValue({ threadId: 't1', runId: 'r1' });
    vi.spyOn(FuelixCopilotClient, 'checkRunStatus')
      .mockResolvedValueOnce('pending')
      .mockResolvedValueOnce('completed');
    vi.spyOn(FuelixCopilotClient, 'getThreadMessages').mockResolvedValue([
      { role: 'assistant', text: JSON.stringify([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }]) },
    ]);

    const result = await generateTriviaBatch([]);

    expect(result).toHaveLength(1);
    expect(FuelixCopilotClient.checkRunStatus).toHaveBeenCalledTimes(2);
  });

  it('includes existing question texts in the prompt to reduce repeats', async () => {
    const createThreadRunSpy = vi
      .spyOn(FuelixCopilotClient, 'createThreadRun')
      .mockResolvedValue({ threadId: 't1', runId: 'r1' });
    vi.spyOn(FuelixCopilotClient, 'checkRunStatus').mockResolvedValue('completed');
    vi.spyOn(FuelixCopilotClient, 'getThreadMessages').mockResolvedValue([
      { role: 'assistant', text: JSON.stringify([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }]) },
    ]);

    await generateTriviaBatch(['What is the PTO policy?']);

    expect(createThreadRunSpy).toHaveBeenCalledWith(expect.stringContaining('What is the PTO policy?'));
  });

  it('instructs the assistant not to invent facts and that fewer than 30 is acceptable', async () => {
    const createThreadRunSpy = vi
      .spyOn(FuelixCopilotClient, 'createThreadRun')
      .mockResolvedValue({ threadId: 't1', runId: 'r1' });
    vi.spyOn(FuelixCopilotClient, 'checkRunStatus').mockResolvedValue('completed');
    vi.spyOn(FuelixCopilotClient, 'getThreadMessages').mockResolvedValue([
      { role: 'assistant', text: JSON.stringify([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }]) },
    ]);

    await generateTriviaBatch([]);

    const prompt = createThreadRunSpy.mock.calls[0]?.[0] as string;
    expect(prompt).toContain('Do not invent, infer, or assume');
    expect(prompt).toContain('returning fewer questions is correct and expected');
  });
});
