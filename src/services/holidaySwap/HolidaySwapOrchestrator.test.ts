import { describe, it, expect, vi } from 'vitest';
import { HolidaySwapOrchestrator } from './HolidaySwapOrchestrator';
import { prisma } from '../../db/prisma';
import * as eligibilityModule from './components/ValidateSwapEligibility';
import * as eligibilityExceptionModule from './components/ValidateSwapEligibilityException';
import * as replacementModule from './components/ValidateReplacementDay';
import * as startExceptionModule from './components/StartSwapExceptionAuthorization';
import * as loadStatusIdsModule from './components/LoadStatusIds';
import { AppError } from '../../errors/AppError';

vi.mock('../../db/prisma', () => ({
  prisma: {
    teamMember: { findUnique: vi.fn() },
    holiday: { findUnique: vi.fn() },
    holidaySwap: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../audit/AuditOrchestrator', () => ({
  auditOrchestrator: { log: vi.fn() },
}));

const teamMember = {
  teamMemberId: 10,
  countryId: 1,
  teamMemberNames: 'Jane',
  teamMemberSurnames: 'Doe',
};

const holiday = {
  holidayId: 3,
  countryId: 1,
  holidayDate: new Date('2026-01-01'),
  holidayName: 'New Year',
};

describe('HolidaySwapOrchestrator.createSwap — exception gate', () => {
  it('routes to exception authorization when the only failure is HOLIDAY_NOT_IN_FUTURE', async () => {
    (prisma.teamMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(teamMember);
    (prisma.holiday.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(holiday);
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    vi.spyOn(eligibilityModule, 'validateSwapEligibility').mockResolvedValue({
      valid: false, errorCode: 'HOLIDAY_NOT_IN_FUTURE', errorMessage: 'The selected holiday must be a future date.',
    });
    vi.spyOn(eligibilityExceptionModule, 'validateSwapEligibilityException').mockResolvedValue({ valid: true });
    vi.spyOn(replacementModule, 'validateReplacementDay').mockResolvedValue({ valid: true });
    const startSpy = vi.spyOn(startExceptionModule, 'startSwapExceptionAuthorization').mockResolvedValue({
      created: {
        holidaySwapId: 100, teamMemberId: 10, holidayId: 3, statusId: 7,
        originalDate: holiday.holidayDate, replacementDate: new Date('2026-06-01'),
        active: false, createdBy: 'employee@example.com', createdAt: null, updatedBy: null, updatedAt: null,
        status: { statusName: 'InAuth' },
      } as never,
      workflowStarted: true,
    });

    const orchestrator = new HolidaySwapOrchestrator();
    const result = await orchestrator.createSwap(
      10,
      { holidayId: 3, replacementDate: '2026-06-01' },
      'employee@example.com',
      55,
    );

    expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({
      teamMemberId: 10,
      holidayId: 3,
      createdBy: 'employee@example.com',
      requestedByUserId: 55,
      reasonComment: 'the original holiday date has already passed',
    }));
    expect(result.statusName).toBe('InAuth');
    expect(prisma.holidaySwap.create).not.toHaveBeenCalled();
  });

  it('throws AppError when HOLIDAY_NOT_IN_FUTURE is not the only failure', async () => {
    (prisma.teamMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(teamMember);
    (prisma.holiday.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(holiday);
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    vi.spyOn(eligibilityModule, 'validateSwapEligibility').mockResolvedValue({
      valid: false, errorCode: 'HOLIDAY_NOT_IN_FUTURE', errorMessage: 'The selected holiday must be a future date.',
    });
    vi.spyOn(eligibilityExceptionModule, 'validateSwapEligibilityException').mockResolvedValue({
      valid: false, errorCode: 'DUPLICATE_SWAP', errorMessage: 'This team member already has an active holiday swap for this holiday.',
    });

    const orchestrator = new HolidaySwapOrchestrator();

    await expect(
      orchestrator.createSwap(10, { holidayId: 3, replacementDate: '2026-06-01' }, 'employee@example.com', 55),
    ).rejects.toThrow(AppError);
  });

  it('still throws a plain Error for a non-exception-eligible failure code', async () => {
    (prisma.teamMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(teamMember);
    (prisma.holiday.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(holiday);
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    vi.spyOn(eligibilityModule, 'validateSwapEligibility').mockResolvedValue({
      valid: false, errorCode: 'HOLIDAY_COUNTRY_MISMATCH', errorMessage: 'This holiday does not belong to your country.',
    });

    const orchestrator = new HolidaySwapOrchestrator();

    await expect(
      orchestrator.createSwap(10, { holidayId: 3, replacementDate: '2026-06-01' }, 'employee@example.com', 55),
    ).rejects.toThrow('This holiday does not belong to your country.');
  });
});

describe('HolidaySwapOrchestrator.createSwapForMember', () => {
  it('passes the supervisor requestedByUserId through to createSwap', async () => {
    const orchestrator = new HolidaySwapOrchestrator();
    const createSwapSpy = vi.spyOn(orchestrator, 'createSwap').mockResolvedValue({} as never);
    vi.spyOn(await import('../timeoff/supervisor/queries'), 'verifySupervisorRelationship').mockResolvedValue(true);

    await orchestrator.createSwapForMember(
      1,
      10,
      { holidayId: 3, replacementDate: '2026-06-01' },
      'supervisor@example.com',
      88,
    );

    expect(createSwapSpy).toHaveBeenCalledWith(
      10,
      { holidayId: 3, replacementDate: '2026-06-01' },
      'supervisor@example.com',
      88,
    );
  });
});

import * as startExceptionOnEditModule from './components/StartSwapExceptionAuthorizationOnEdit';

describe('HolidaySwapOrchestrator.updateSwapForMember — exception gate', () => {
  const existingSwap = {
    holidaySwapId: 200,
    teamMemberId: 10,
    holidayId: 9,
    statusId: 1,
    originalDate: new Date('2025-12-25'),
    replacementDate: new Date('2026-08-01'),
    active: true,
    createdBy: 'employee@example.com',
    holiday: { holidayName: 'Old Holiday' },
    status: { statusName: 'Tentative' },
  };

  it('routes to exception authorization on edit when the new holiday only fails HOLIDAY_NOT_IN_FUTURE', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingSwap);
    (prisma.teamMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(teamMember);
    (prisma.holiday.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(holiday);
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });
    vi.spyOn(await import('../timeoff/supervisor/queries'), 'verifySupervisorRelationship').mockResolvedValue(true);
    vi.spyOn(eligibilityModule, 'validateSwapEligibility').mockResolvedValue({
      valid: false, errorCode: 'HOLIDAY_NOT_IN_FUTURE', errorMessage: 'The selected holiday must be a future date.',
    });
    vi.spyOn(eligibilityExceptionModule, 'validateSwapEligibilityException').mockResolvedValue({ valid: true });
    vi.spyOn(replacementModule, 'validateReplacementDay').mockResolvedValue({ valid: true });
    const startEditSpy = vi.spyOn(startExceptionOnEditModule, 'startSwapExceptionAuthorizationOnEdit').mockResolvedValue({
      updated: { ...existingSwap, statusId: 7, active: false, status: { statusName: 'InAuth' } } as never,
      workflowStarted: true,
    });

    const orchestrator = new HolidaySwapOrchestrator();
    const result = await orchestrator.updateSwapForMember(
      200,
      1,
      { holidayId: 3, replacementDate: '2026-06-01' },
      'supervisor@example.com',
      99,
    );

    expect(startEditSpy).toHaveBeenCalledWith(expect.objectContaining({
      holidaySwapId: 200,
      holidayId: 3,
      updatedBy: 'supervisor@example.com',
      requestedByUserId: 99,
      reasonComment: 'the original holiday date has already passed',
    }));
    expect(result.statusName).toBe('InAuth');
  });

  it('blocks editing a swap that is already InAuth', async () => {
    (prisma.holidaySwap.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...existingSwap, statusId: 7, status: { statusName: 'InAuth' },
    });
    vi.spyOn(loadStatusIdsModule, 'loadStatusIds').mockResolvedValue({
      pending: 1, approved: 2, rejected: 5, cancelled: 4, taken: 3, pendingAuth: 7,
    });

    const orchestrator = new HolidaySwapOrchestrator();

    await expect(
      orchestrator.updateSwapForMember(200, 1, { holidayId: 3, replacementDate: '2026-06-01' }, 'supervisor@example.com', 99),
    ).rejects.toThrow('A swap with status "InAuth" cannot be edited.');
  });
});
