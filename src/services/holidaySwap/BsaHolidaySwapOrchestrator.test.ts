// src/services/holidaySwap/BsaHolidaySwapOrchestrator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BsaHolidaySwapOrchestrator } from './BsaHolidaySwapOrchestrator';
import * as getSwapForBsaModule from '../teamMember/queries/getSwapForBsa';

describe('BsaHolidaySwapOrchestrator.getSwapDetailException', () => {
  it('delegates to getSwapForBsa and returns its result', async () => {
    const dto = { holidaySwapId: 42 } as never;
    vi.spyOn(getSwapForBsaModule, 'getSwapForBsa').mockResolvedValue(dto);
    const orchestrator = new BsaHolidaySwapOrchestrator();

    const result = await orchestrator.getSwapDetailException(42);

    expect(getSwapForBsaModule.getSwapForBsa).toHaveBeenCalledWith(42);
    expect(result).toBe(dto);
  });

  it('throws when the swap is not found', async () => {
    vi.spyOn(getSwapForBsaModule, 'getSwapForBsa').mockResolvedValue(null);
    const orchestrator = new BsaHolidaySwapOrchestrator();

    await expect(orchestrator.getSwapDetailException(999)).rejects.toThrow('Holiday swap not found.');
  });
});
