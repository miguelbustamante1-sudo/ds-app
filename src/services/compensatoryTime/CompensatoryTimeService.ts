/**
 * Compensatory Time - Service (Business Logic Layer)
 *
 * Responsibility: orchestrate business operations on compensatory time records.
 * Depends on the repository abstraction (DIP).
 */

import type { CompensatoryTimeDTO, CompStatus, CompType } from '../../../shared/dto/CompensatoryTime';
import type { CompensatoryTimeSummary, PaginationOptions, UpdateCompensatoryTimeInput } from './repository';
import { createCompensatoryTime, getAllCompensatoryTimes, getCompensatoryTimeBalance, getCompensatoryTimeById, getCompensatoryTimeSummary, getNightPolicyForTeamMember, getShiftDetailsForAssignment, softDeleteCompensatoryTime, updateCompensatoryTime, countCompensatoryTimes } from './repository';
import { getReportLevelMapForCompensatoryTime } from '../teamMember/queries/getReportsForCompensatoryTime';
import { getAllSubordinateIdsForCompensatoryTime, getDirectReportIdsForCompensatoryTime } from '../teamMember/queries/getSubordinatesForCompensatoryTime';

/** Minimal interface the service depends on (DIP) */
export interface CreateCompensatoryTimeInput {
  startingTime: Date;
  endingTime: Date;
  subject: string;
  teamMemberId: number;
  projectId: number;
  dayHours: number;
  nightHours: number;
  totalCreditedHours?: number;
  createdBy: string;
  compType?: CompType;
}

export interface ICompensatoryTimeRepository {
  getAll(pagination: PaginationOptions & { teamMemberId?: number }): Promise<CompensatoryTimeDTO[]>;
  getById(id: number): Promise<CompensatoryTimeDTO | null>;
  create(data: CreateCompensatoryTimeInput): Promise<CompensatoryTimeDTO>;
  softDelete(id: number): Promise<CompensatoryTimeDTO | null>;
  update(id: number, data: UpdateCompensatoryTimeInput): Promise<CompensatoryTimeDTO | null>;
  getSummary(teamMemberId?: number, compType?: CompType): Promise<CompensatoryTimeSummary>;
}

/** Default repository adapter */
const defaultRepository: ICompensatoryTimeRepository = {
  getAll:      getAllCompensatoryTimes,
  getById:     getCompensatoryTimeById,
  create:      createCompensatoryTime,
  softDelete:  softDeleteCompensatoryTime,
  update:      updateCompensatoryTime,
  getSummary:  (teamMemberId?: number, compType?: CompType) => getCompensatoryTimeSummary(teamMemberId, compType),
};

export class CompensatoryTimeService {
  private readonly repository: ICompensatoryTimeRepository;

  constructor(repository: ICompensatoryTimeRepository = defaultRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves a paginated list of compensatory time records.
   * Defaults: page = 1, limit = 10 (max 100).
   */
  async getAll(pagination?: Partial<PaginationOptions> & { teamMemberId?: number; teamMemberIds?: number[]; status?: CompStatus; statuses?: CompStatus[]; compType?: CompType; includeReportLevelForSupId?: number; teamMemberSearch?: string; projectSearch?: string; subjectSearch?: string; rejectionReasonSearch?: string }): Promise<CompensatoryTimeDTO[]> {
    const page  = Math.max(1, pagination?.page  ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 10));

    let memberFilter: { teamMemberIds: number[] } | { teamMemberId: number } | Record<string, never> = {};
    if (pagination?.teamMemberIds !== undefined) {
      memberFilter = { teamMemberIds: pagination.teamMemberIds };
    } else if (pagination?.teamMemberId !== undefined) {
      memberFilter = { teamMemberId: pagination.teamMemberId };
    }

    let statusFilter: { statuses: CompStatus[] } | { status: CompStatus } | Record<string, never> = {};
    if (pagination?.statuses !== undefined) {
      statusFilter = { statuses: pagination.statuses };
    } else if (pagination?.status !== undefined) {
      statusFilter = { status: pagination.status };
    }

    const supId = pagination?.includeReportLevelForSupId;
    const [records, levelMap] = await Promise.all([
      this.repository.getAll({
        page,
        limit,
        ...memberFilter,
        ...statusFilter,
        ...(pagination?.compType !== undefined ? { compType: pagination.compType } : {}),
        ...(pagination?.teamMemberSearch ? { teamMemberSearch: pagination.teamMemberSearch } : {}),
        ...(pagination?.projectSearch ? { projectSearch: pagination.projectSearch } : {}),
        ...(pagination?.subjectSearch ? { subjectSearch: pagination.subjectSearch } : {}),
        ...(pagination?.rejectionReasonSearch ? { rejectionReasonSearch: pagination.rejectionReasonSearch } : {}),
        ...(pagination?.sortBy  ? { sortBy:  pagination.sortBy  } : {}),
        ...(pagination?.sortDir ? { sortDir: pagination.sortDir } : {}),
      }),
      supId !== undefined ? getReportLevelMapForCompensatoryTime(supId) : Promise.resolve(undefined),
    ]);

    if (levelMap === undefined) {
      return records.map((r) => ({ ...r, reportLevel: -1 }));
    }
    return records.map((r) => ({
      ...r,
      reportLevel: levelMap.get(r.teamMemberId) ?? -1,
    }));
  }

  /**
   * Returns a single compensatory time record by id, or null if not found.
   */
  async getById(id: number): Promise<CompensatoryTimeDTO | null> {
    return this.repository.getById(id);
  }

  /**
   * Creates a new compensatory time record.
   */
  async create(data: CreateCompensatoryTimeInput): Promise<CompensatoryTimeDTO> {
    return this.repository.create(data);
  }

  /**
   * Returns a count of records grouped by status, scoped to the given
   * teamMemberId when provided (non-admin users).
   */
  async getSummary(teamMemberId?: number, compType?: CompType): Promise<CompensatoryTimeSummary> {
    return this.repository.getSummary(teamMemberId, compType);
  }

  /**
   * Soft-deletes a compensatory time record (sets deleted = true).
   * Returns the updated record, or null if not found.
   */
  async update(id: number, data: UpdateCompensatoryTimeInput): Promise<CompensatoryTimeDTO | null> {
    return this.repository.update(id, data);
  }

  async delete(id: number): Promise<CompensatoryTimeDTO | null> {
    return this.repository.softDelete(id);
  }

  /**
   * Validates a usage entry before it is submitted.
   *
   * Checks:
   *   1. startingTime and endingTime are valid ISO datetime strings.
   *   2. endingTime is strictly after startingTime.
   *   3. The hours derived from the window (end - start) do not exceed the
   *      team member's current APPROVED balance.
   *
   * Returns { valid: true } or { valid: false, error: string }.
   */
  async validateUsageEntry(
    teamMemberId: number,
    projectId: number,
    startingTime: Date,
    endingTime: Date,
  ): Promise<{ valid: boolean; error?: string; balanceHours?: number; requestedHours?: number }> {
    const [shiftValidation, { balanceHours }] = await Promise.all([
      this.validateUsageRecord(teamMemberId, projectId, startingTime, endingTime),
      getCompensatoryTimeBalance(teamMemberId),
    ]);

    if (!shiftValidation.valid) {
      return { valid: false, error: shiftValidation.error ?? 'Shift validation failed' };
    }

    const diffMs = endingTime.getTime() - startingTime.getTime();
    const requestedHours = Math.round(diffMs / 3_600_000 * 100) / 100;

    if (requestedHours > balanceHours) {
      return {
        valid: false,
        error: `Requested hours (${requestedHours}) exceed the available balance (${balanceHours})`,
        balanceHours,
        requestedHours,
      };
    }

    return { valid: true, balanceHours, requestedHours };
  }

  /**
   * Returns the compensatory time balance for a team member.
   * earnedHours = SUM(EARNED dayHours + nightHours * nightMultiplier)
   * usedHours   = SUM(USED dayHours)
   * balanceHours = earnedHours - usedHours
   */
  async getBalance(teamMemberId: number): Promise<{ earnedHours: number; usedHours: number; pendingHours: number; balanceHours: number; nightMultiplier: number; nightStart: number | null; nightEnd: number | null }> {
    return getCompensatoryTimeBalance(teamMemberId);
  }

  /**
   * Validates a usage record window against the shift assigned to the team member
   * for the given project.
   *
   * Rules:
   *   1. startingTime and endingTime must be valid dates.
   *   2. endingTime must be strictly after startingTime.
   *   3. startingTime and endingTime must fall within working hours on their
   *      respective calendar days (shift startTime <= hour < shift endTime).
   *
   * Returns { valid: true } or { valid: false, error: string }.
   */
  async validateUsageRecord(
    teamMemberId: number,
    projectId: number,
    startingTime: Date,
    endingTime: Date,
  ): Promise<{ valid: boolean; error?: string }> {
    if (isNaN(startingTime.getTime())) {
      return { valid: false, error: 'startingTime is not a valid date' };
    }
    if (isNaN(endingTime.getTime())) {
      return { valid: false, error: 'endingTime is not a valid date' };
    }
    const diffMs = endingTime.getTime() - startingTime.getTime();
    if (diffMs < 60_000) {
      return { valid: false, error: 'endingTime must be at least 1 minute after startingTime' };
    }

    const details = await getShiftDetailsForAssignment(teamMemberId, projectId);
    if (!details || details.length === 0) {
      return { valid: false, error: 'No active shift assignment found for this team member and project' };
    }

    const shiftByDay = new Map<number, { startTime: number; endTime: number }>();
    for (const d of details) {
      shiftByDay.set(d.dayOfWeek, { startTime: d.startTime, endTime: d.endTime });
    }

    // Validate startingTime is within shift on its day
    const startDow = startingTime.getDay();
    const startShift = shiftByDay.get(startDow);
    if (!startShift) {
      return { valid: false, error: `No shift defined for the day of week of startingTime (day ${startDow})` };
    }
    const startHour = startingTime.getHours() + startingTime.getMinutes() / 60;
    if (startHour < startShift.startTime || startHour >= startShift.endTime) {
      return { valid: false, error: `startingTime is outside working hours (shift: ${startShift.startTime}:00 - ${startShift.endTime}:00)` };
    }

    // Validate endingTime is within shift on its day
    const endDow = endingTime.getDay();
    const endShift = shiftByDay.get(endDow);
    if (!endShift) {
      return { valid: false, error: `No shift defined for the day of week of endingTime (day ${endDow})` };
    }
    const endHour = endingTime.getHours() + endingTime.getMinutes() / 60;
    if (endHour <= endShift.startTime || endHour > endShift.endTime) {
      return { valid: false, error: `endingTime is outside working hours (shift: ${endShift.startTime}:00 - ${endShift.endTime}:00)` };
    }

    return { valid: true };
  }

  /**
   * Checks whether [startingTime, endingTime) overlaps with the shift
   * assigned to the team member for the given project.
   *
   * Overlap is detected per calendar day: for each day covered by the
   * requested window, the shift detail for that day-of-week (if any) is
   * compared as a time-of-day range.  startTime / endTime in ShiftDetail
   * are stored as minutes from midnight.
   *
   * Returns true when overlap is found, false otherwise.
   * Returns false (no check) when the team member has no active assignment
   * with a shift linked.
   */
  async checkShiftOverlap(teamMemberId: number, projectId: number, startingTime: Date, endingTime: Date): Promise<boolean> {
    const details = await getShiftDetailsForAssignment(teamMemberId, projectId);
    if (!details || details.length === 0) return false;

    // Build a map of dayOfWeek -> { startTime, endTime } in minutes from midnight
    const shiftByDay = new Map<number, { startTime: number; endTime: number }>();
    for (const d of details) {
      shiftByDay.set(d.dayOfWeek, { startTime: d.startTime, endTime: d.endTime });
    }

    // Snapshot the midnight timestamps of the first and last days of the window
    const startDayMidnight = new Date(startingTime);
    startDayMidnight.setHours(0, 0, 0, 0);

    const endDayMidnight = new Date(endingTime);
    endDayMidnight.setHours(0, 0, 0, 0);

    // Iterate over each calendar day covered by [startingTime, endingTime)
    const cursor = new Date(startDayMidnight);

    while (cursor.getTime() <= endDayMidnight.getTime()) {
      const dow = cursor.getDay(); // 0 = Sunday, 4 = Thursday
      const shift = shiftByDay.get(dow);
      if (shift) {
        // Clamp the requested window to decimal hours on this specific day.
        // ShiftDetail.startTime / endTime are stored as integer hours (e.g. 8 = 08:00, 18 = 18:00).
        const reqStartHours = cursor.getTime() === startDayMidnight.getTime()
          ? startingTime.getHours() + startingTime.getMinutes() / 60
          : 0;
        const reqEndHours = cursor.getTime() === endDayMidnight.getTime()
          ? endingTime.getHours() + endingTime.getMinutes() / 60
          : 24;

        // Standard interval overlap: A overlaps B iff A.start < B.end && A.end > B.start
        if (reqStartHours < shift.endTime && reqEndHours > shift.startTime) {
          return true;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  /**
   * Calculates day and night hours for a given compensatory time window,
   * taking into account:
   *   1. The team member's country night policy [nightStart, nightEnd).
   *   2. The shift assigned to the team member for the given project on each
   *      calendar day of the window.
   *
   * Classification per 1-hour slot:
   *   - nightHours : slot falls inside the country night window.
   *   - dayHours   : slot is NOT in the night window AND NOT inside the shift
   *                  for that day-of-week (i.e. it is compensatory time outside
   *                  both the regular shift and the night policy).
   *   - (uncounted): slot falls inside the shift — regular working time.
   *
   * Supports midnight-wrapping night windows (nightStart > nightEnd, e.g. 18-07).
   */
  async hoursPerShift(teamMemberId: number, projectId: number, startingTime: Date, endingTime: Date): Promise<{ dayHours: number; nightHours: number }> {
    const [nightPolicy, shiftDetails] = await Promise.all([
      getNightPolicyForTeamMember(teamMemberId),
      getShiftDetailsForAssignment(teamMemberId, projectId),
    ]);

    // Build a map of dayOfWeek -> { startTime, endTime } in integer hours
    const shiftByDay = new Map<number, { startTime: number; endTime: number }>();
    if (shiftDetails) {
      for (const d of shiftDetails) {
        shiftByDay.set(d.dayOfWeek, { startTime: d.startTime, endTime: d.endTime });
      }
    }

    let nightMinutes = 0;
    let dayMinutes   = 0;

    // Walk each 1-hour slot in [startingTime, endingTime)
    const cursor = new Date(startingTime);
    cursor.setMinutes(0, 0, 0); // floor to hour boundary

    while (cursor < endingTime) {
      const slotStart = cursor.getTime();
      const slotEnd   = slotStart + 3_600_000;

      // Actual overlap of this slot with [startingTime, endingTime)
      const overlapStart = Math.max(slotStart, startingTime.getTime());
      const overlapEnd   = Math.min(slotEnd,   endingTime.getTime());
      const overlapMs    = overlapEnd - overlapStart;

      if (overlapMs > 0) {
        const h   = cursor.getHours();
        const dow = cursor.getDay();

        // 1. Is this slot inside the country night window?
        const isNight = nightPolicy !== null && (
          nightPolicy.nightStart < nightPolicy.nightEnd
            ? h >= nightPolicy.nightStart && h < nightPolicy.nightEnd   // non-wrapping e.g. 00-06
            : h >= nightPolicy.nightStart || h < nightPolicy.nightEnd   // wrapping     e.g. 18-07
        );

        if (isNight) {
          nightMinutes += overlapMs / 60_000;
        } else {
          // 2. Is this slot inside the regular shift for this day-of-week?
          const shift = shiftByDay.get(dow);
          const inShift = shift !== undefined && h >= shift.startTime && h < shift.endTime;

          if (!inShift) {
            // Neither night nor regular shift -> compensatory day hour
            dayMinutes += overlapMs / 60_000;
          }
        }
      }

      cursor.setHours(cursor.getHours() + 1);
    }

    // Round to 2 decimal places so values like 1.25, 1.50, 1.75, 2.00 are possible
    return {
      dayHours:   Math.round(dayMinutes   / 60 * 100) / 100,
      nightHours: Math.round(nightMinutes / 60 * 100) / 100,
    };
  }

  async count(options: Parameters<typeof countCompensatoryTimes>[0]): Promise<number> {
    return countCompensatoryTimes(options);
  }

  async getSubordinateIds(supervisorId: number): Promise<number[]> {
    return getAllSubordinateIdsForCompensatoryTime(supervisorId);
  }

  async getTeamMemberIdsBySupervisorId(supervisorId: number): Promise<number[]> {
    return getDirectReportIdsForCompensatoryTime(supervisorId);
  }

  async getShiftDetails(teamMemberId: number, projectId: number) {
    return getShiftDetailsForAssignment(teamMemberId, projectId);
  }

  async getReportLevelMapForSupervisor(supervisorId: number): Promise<Map<number, number>> {
    return getReportLevelMapForCompensatoryTime(supervisorId);
  }
}

/** Singleton instance used by the route layer */
export const compensatoryTimeService = new CompensatoryTimeService();
