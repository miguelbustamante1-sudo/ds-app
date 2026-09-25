import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTriviaBatch, parseTriviaBatchResponse } from './GenerateTriviaBatch';
import * as FuelixCopilotClient from '../../sop/FuelixCopilotClient';

function block(question: string, options: [string, string, string, string], correct: 'A' | 'B' | 'C' | 'D'): string {
  return [
    `Q: ${question}`,
    `A) ${options[0]}`,
    `B) ${options[1]}`,
    `C) ${options[2]}`,
    `D) ${options[3]}`,
    `CORRECT: ${correct}`,
    '---',
  ].join('\n');
}

describe('parseTriviaBatchResponse', () => {
  it('parses a single well-formed block', () => {
    const raw = block('What is the PTO policy?', ['A', 'B', 'C', 'D'], 'B');

    const result = parseTriviaBatchResponse(raw);

    expect(result).toEqual([
      { questionText: 'What is the PTO policy?', option1: 'A', option2: 'B', option3: 'C', option4: 'D', correctOptionIndex: 1 },
    ]);
  });

  it('parses multiple blocks', () => {
    const raw = [
      block('Question one?', ['A', 'B', 'C', 'D'], 'A'),
      block('Question two?', ['E', 'F', 'G', 'H'], 'D'),
    ].join('\n');

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(2);
    expect(result[0]?.questionText).toBe('Question one?');
    expect(result[1]?.questionText).toBe('Question two?');
    expect(result[1]?.correctOptionIndex).toBe(3);
  });

  it('tolerates prose, headings, and citation markers around and between blocks', () => {
    const raw = `Here are your trivia questions, grounded in the knowledge base【source†1】:

## Batch

${block('What is the PTO policy?', ['A', 'B', 'C', 'D'], 'C')}

Hope that helps!`;

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(1);
    expect(result[0]?.correctOptionIndex).toBe(2);
  });

  it('tolerates markdown code fences wrapping a block', () => {
    const raw = '```\n' + block('What is the PTO policy?', ['A', 'B', 'C', 'D'], 'A') + '\n```';

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(1);
  });

  it('drops an incomplete block (missing an option) but keeps a valid one that follows', () => {
    const incomplete = 'Q: Broken question?\nA) Only one option\nCORRECT: A\n---';
    const raw = `${incomplete}\n${block('Good question?', ['A', 'B', 'C', 'D'], 'B')}`;

    const result = parseTriviaBatchResponse(raw);

    expect(result).toHaveLength(1);
    expect(result[0]?.questionText).toBe('Good question?');
  });

  it('throws AppError(502) when the response is empty', () => {
    expect(() => parseTriviaBatchResponse('   ')).toThrow('Fuel iX returned no trivia content');
  });

  it('throws AppError(502) with a raw-response snippet when nothing parses', () => {
    expect(() => parseTriviaBatchResponse('Sorry, I cannot help with that request.')).toThrow(
      /Fuel iX returned no parseable trivia questions\. Raw response: Sorry, I cannot help with that request\./,
    );
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
      { role: 'assistant', text: block('Q1', ['A', 'B', 'C', 'D'], 'A') },
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
      { role: 'assistant', text: block('Q1', ['A', 'B', 'C', 'D'], 'A') },
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
      { role: 'assistant', text: block('Q1', ['A', 'B', 'C', 'D'], 'A') },
    ]);

    await generateTriviaBatch([]);

    const prompt = createThreadRunSpy.mock.calls[0]?.[0] as string;
    expect(prompt).toContain('Do not invent, infer, or assume');
    expect(prompt).toContain('returning fewer questions is correct and expected');
  });
});
