import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { CompensatoryTimeDTO, CompStatus, CompType } from '@shared/dto/CompensatoryTime';

const BASE = '/api/compensatory-time';

/** Fetch a paginated list of compensatory time records (admin view).
 *  Returns both the page of data and the total record count from the
 *  X-Total-Count response header so the table can paginate server-side. */
export const getCompensatoryTimesAdmin = async (
  page = 1,
  limit = 25,
  compType?: CompType,
  statuses?: CompStatus[],
  columnSearches?: Record<string, string>,
  sort?: { id: string; desc: boolean },
): Promise<{ data: CompensatoryTimeDTO[]; total: number }> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (compType !== undefined) params.append('compType', compType);
  if (statuses !== undefined && statuses.length > 0) {
    statuses.forEach((s) => params.append('status', s));
  }
  if (columnSearches) {
    if (columnSearches['teamMemberId']) params.append('teamMemberSearch', columnSearches['teamMemberId']);
    if (columnSearches['projectId']) params.append('projectSearch', columnSearches['projectId']);
    if (columnSearches['subject']) params.append('subjectSearch', columnSearches['subject']);
    if (columnSearches['rejectionReason']) params.append('rejectionReasonSearch', columnSearches['rejectionReason']);
  }
  if (sort) {
    params.append('sortBy', sort.id);
    params.append('sortDir', sort.desc ? 'desc' : 'asc');
  }
  const url = `${BASE}/?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((errorData as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  const json = (await response.json()) as CompensatoryTimeDTO[];
  const total = parseInt(response.headers.get('X-Total-Count') ?? '0', 10);
  return { data: Array.isArray(json) ? json : [], total };
};

/** Fetch a paginated list of compensatory time records for non-admin users (server-side pagination).
 *  Returns both the page of data and the total record count from the
 *  X-Total-Count response header so the table can paginate server-side. */
export const getCompensatoryTimesUser = async (
  page = 1,
  limit = 25,
  compType?: CompType,
  statuses?: CompStatus[],
  columnSearches?: Record<string, string>,
  sort?: { id: string; desc: boolean },
  teamMemberId?: number,
): Promise<{ data: CompensatoryTimeDTO[]; total: number }> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (teamMemberId !== undefined) params.append('teamMemberId', String(teamMemberId));
  if (compType !== undefined) params.append('compType', compType);
  if (statuses !== undefined && statuses.length > 0) {
    statuses.forEach((s) => params.append('status', s));
  }
  if (columnSearches) {
    if (columnSearches['teamMemberId']) params.append('teamMemberSearch', columnSearches['teamMemberId']);
    if (columnSearches['projectId']) params.append('projectSearch', columnSearches['projectId']);
    if (columnSearches['subject']) params.append('subjectSearch', columnSearches['subject']);
    if (columnSearches['rejectionReason']) params.append('rejectionReasonSearch', columnSearches['rejectionReason']);
  }
  if (sort) {
    params.append('sortBy', sort.id);
    params.append('sortDir', sort.desc ? 'desc' : 'asc');
  }
  const url = `${BASE}/?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((errorData as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  const json = (await response.json()) as CompensatoryTimeDTO[];
  const total = parseInt(response.headers.get('X-Total-Count') ?? '0', 10);
  return { data: Array.isArray(json) ? json : [], total };
};

/** Fetch a paginated list of compensatory time records. */
export const getCompensatoryTimes = (page = 1, limit = 50, teamMemberId?: number, compType?: CompType, statuses?: CompStatus[], includeReportLevelForSupId?: number) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (teamMemberId !== undefined) params.append('teamMemberId', String(teamMemberId));
  if (compType !== undefined) params.append('compType', compType);
  if (statuses !== undefined && statuses.length > 0) {
    statuses.forEach((s) => params.append('status', s));
  }
  if (includeReportLevelForSupId !== undefined) params.append('includeReportLevelForSupId', String(includeReportLevelForSupId));
  return apiGet<CompensatoryTimeDTO[]>(`${BASE}/?${params.toString()}`);
};

export interface CreateCompensatoryTimePayload {
  startingTime: string;
  endingTime: string;
  subject: string;
  teamMemberId: number;
  projectId: number;
  dayHours: number;
  nightHours: number;
  totalCreditedHours?: number;
  compType?: CompType;
}

/** Create a new compensatory time record. */
export const createCompensatoryTime = (payload: CreateCompensatoryTimePayload) =>
  apiPost<CompensatoryTimeDTO, CreateCompensatoryTimePayload>(`${BASE}/`, payload);

/** Fetch the status summary for the current user's compensatory time records. */
export const getCompensatoryTimeSummary = (compType?: string) => {
  const params = compType !== undefined ? `?compType=${encodeURIComponent(compType)}` : '';
  return apiGet<{ totalByStatus: Record<string, number>; totalHoursByStatus: Record<string, number> }>(`${BASE}/summary${params}`);
};

/** Update the status of a compensatory time record. */
export const updateCompensatoryTimeStatus = (id: number, status: CompStatus, rejectionReason?: string) =>
  apiPatch<CompensatoryTimeDTO, { status: CompStatus; rejectionReason?: string }>(
    `${BASE}/${id}`,
    { status, ...(rejectionReason !== undefined ? { rejectionReason } : {}) },
  );

/** Soft-delete a compensatory time record by id. */
export const deleteCompensatoryTime = (id: number) =>
  apiDelete(`${BASE}/${id}`);

export interface ShiftDetail {
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  workingHours: number;
}

/** Fetch the shift details (hours per day-of-week) for a team member + project. */
export const getShiftDetails = (teamMemberId: number, projectId: number) => {
  const params = new URLSearchParams({
    teamMemberId: String(teamMemberId),
    projectId:    String(projectId),
  });
  return apiGet<ShiftDetail[]>(`${BASE}/shift-details?${params.toString()}`);
};

export interface CompensatoryTimeBalance {
  earnedHours: number;
  usedHours: number;
  pendingHours: number;
  balanceHours: number;
  nightMultiplier: number;
  nightStart: number | null;
  nightEnd: number | null;
}

/** Fetch the compensatory time balance for the authenticated user (or a specific teamMemberId). */
export const getCompensatoryTimeBalance = (teamMemberId?: number) => {
  const params = teamMemberId !== undefined ? `?teamMemberId=${teamMemberId}` : '';
  return apiGet<CompensatoryTimeBalance>(`${BASE}/balance${params}`);
};

/** Validate a usage entry: checks dates, shift hours, and available balance. */
export const validateUsageRecord = (
  teamMemberId: number,
  projectId: number,
  startingTime: string,
  endingTime: string,
) =>
  apiPost<{ valid: boolean; error?: string; balanceHours?: number; requestedHours?: number }, { teamMemberId: number; projectId: number; startingTime: string; endingTime: string }>(
    `${BASE}/validate-usage-entry`,
    { teamMemberId, projectId, startingTime, endingTime },
  );

/** Fetch a paginated list of compensatory time records for the supervisor's subordinates (server-side pagination).
 *  Returns both the page of data and the total record count from the
 *  X-Total-Count response header so the table can paginate server-side. */
export const getCompensatoryTimesBySupervisorPaginated = async (
  supervisorId: number,
  page = 1,
  limit = 25,
  statuses?: CompStatus[],
  includeReportLevelForSupId?: number,
  compType?: CompType,
  reportLevels?: number[],
  columnSearches?: Record<string, string>,
  sort?: { id: string; desc: boolean },
): Promise<{ data: CompensatoryTimeDTO[]; total: number }> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (compType !== undefined) params.append('compType', compType);
  if (statuses !== undefined && statuses.length > 0) {
    statuses.forEach((s) => params.append('status', s));
  }
  if (includeReportLevelForSupId !== undefined) params.append('includeReportLevelForSupId', String(includeReportLevelForSupId));
  if (reportLevels !== undefined && reportLevels.length > 0) {
    reportLevels.forEach((l) => params.append('reportLevel', String(l)));
  }
  if (columnSearches) {
    if (columnSearches['teamMemberId']) params.append('teamMemberSearch', columnSearches['teamMemberId']);
    if (columnSearches['projectId']) params.append('projectSearch', columnSearches['projectId']);
    if (columnSearches['subject']) params.append('subjectSearch', columnSearches['subject']);
    if (columnSearches['rejectionReason']) params.append('rejectionReasonSearch', columnSearches['rejectionReason']);
  }
  if (sort) {
    params.append('sortBy', sort.id);
    params.append('sortDir', sort.desc ? 'desc' : 'asc');
  }
  const url = `${BASE}/by-supervisor/${supervisorId}?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((errorData as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  const json = (await response.json()) as CompensatoryTimeDTO[];
  const total = parseInt(response.headers.get('X-Total-Count') ?? '0', 10);
  return { data: Array.isArray(json) ? json : [], total };
};

/** Fetch the maximum report level depth in a supervisor's full recursive subordinate hierarchy. */
export const getMaxReportLevelBySupervisor = async (supervisorId: number): Promise<number> => {
  const url = `${BASE}/by-supervisor/${supervisorId}/max-report-level`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    return 0;
  }
  const json = (await response.json()) as { maxDepth: number };
  return json.maxDepth ?? 0;
};

/** Fetch compensatory time records for all subordinates of a supervisor (full recursive hierarchy). */
export const getCompensatoryTimesBySupervisor = (supervisorId: number, page = 1, limit = 100, statuses?: CompStatus[], includeReportLevelForSupId?: number, compType?: CompType) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (compType !== undefined) params.append('compType', compType);
  if (statuses !== undefined && statuses.length > 0) {
    statuses.forEach((s) => params.append('status', s));
  }
  if (includeReportLevelForSupId !== undefined) params.append('includeReportLevelForSupId', String(includeReportLevelForSupId));
  return apiGet<CompensatoryTimeDTO[]>(`${BASE}/by-supervisor/${supervisorId}?${params.toString()}`);
};

/** Fetch day and night hours for a given shift window from the server. */
export const getHoursPerShift = (
  teamMemberId: number,
  projectId: number,
  startingTime: string,
  endingTime: string,
) => {
  const params = new URLSearchParams({
    teamMemberId: String(teamMemberId),
    projectId:    String(projectId),
    startingTime,
    endingTime,
  });
  return apiGet<{ dayHours: number; nightHours: number }>(`${BASE}/hours-per-shift?${params.toString()}`);
};
