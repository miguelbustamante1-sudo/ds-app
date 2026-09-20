import { describe, it, expect, vi } from 'vitest';
import { canViewSwap } from './canViewSwap';
import * as getReportsForHolidaySwapHistoryModule from '../teamMember/queries/getReportsForHolidaySwapHistory';

describe('canViewSwap', () => {
  it('returns true when the requester is the swap owner', async () => {
    expect(await canViewSwap(10, 10)).toBe(true);
  });

  it('returns true when the swap owner is in the requester reports', async () => {
    vi.spyOn(getReportsForHolidaySwapHistoryModule, 'getReportsForHolidaySwapHistory').mockResolvedValue([20]);
    expect(await canViewSwap(10, 20)).toBe(true);
  });

  it('returns false when the swap owner is not in the requester reports', async () => {
    vi.spyOn(getReportsForHolidaySwapHistoryModule, 'getReportsForHolidaySwapHistory').mockResolvedValue([99]);
    expect(await canViewSwap(10, 20)).toBe(false);
  });
});
