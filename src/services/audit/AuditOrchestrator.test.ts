// src/services/audit/AuditOrchestrator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuditOrchestrator } from './AuditOrchestrator';
import * as repository from './repository';

describe('AuditOrchestrator.getHistory', () => {
  it('delegates to repository.getByEntity with the same arguments', async () => {
    const rows = [{ id: '1' }];
    const spy = vi.spyOn(repository, 'getByEntity').mockResolvedValue(rows as never);
    const orchestrator = new AuditOrchestrator();

    const result = await orchestrator.getHistory('hsw_holiday_swap', '42');

    expect(spy).toHaveBeenCalledWith('hsw_holiday_swap', '42');
    expect(result).toBe(rows);
  });
});
