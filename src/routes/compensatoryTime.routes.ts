/**
 * Compensatory Time - Routes
 *
 * Responsibility: HTTP transport layer only (thin controller).
 * All business logic lives in CompensatoryTimeService.
 *
 * Security: every endpoint requires admin-level permission via
 * requirePermission('CompensatoryTime', ...), consistent
 * with the RBAC pattern used across the application.
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { compensatoryTimeService } from '../services/compensatoryTime/CompensatoryTimeService';
import { getAllSubordinateIds, countCompensatoryTimes, getTeamMemberIdsBySupervisor } from '../services/compensatoryTime/repository';
import type { SortableColumn } from '../services/compensatoryTime/repository';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import { error } from '../logger';

const ALLOWED_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED'] as const;

const router = Router();

// --- GET /compensatory-time/summary ------------------------------------------
// Returns a count of non-deleted records grouped by status.
// Admins see all records; non-admins see only their own.
// req.user.teamMemberId is set server-side by enrichWithDsFields after JWT
// validation, so it is guaranteed to be the authenticated user's own ID.
router.get(
  '/summary',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawCompType = (req as Request).query['compType'];
      const compType    = rawCompType !== undefined ? String(rawCompType) : undefined;
      const isAdmin     = req.user?.roles.includes('admin') ?? false;

      if (isAdmin) {
        const result = await compensatoryTimeService.getSummary(undefined, compType);
        res.json(result);
      } else {
        const teamMemberId = req.user?.teamMemberId;
        if (teamMemberId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }
        const result = await compensatoryTimeService.getSummary(teamMemberId, compType);
        res.json(result);
      }
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch compensatory time summary' });
    }
  },
);

// --- POST /compensatory-time/ ------------------------------------------------
// Creates a new compensatory time record.
// Body: { startingTime, endingTime, subject, teamMemberId, projectId }
router.post(
  '/',
  requirePermission('CompensatoryTime', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startingTime, endingTime, subject, teamMemberId, projectId, dayHours, nightHours, totalCreditedHours, compType } = req.body as {
        startingTime: string;
        endingTime: string;
        subject: string;
        teamMemberId: number;
        projectId: number;
        dayHours?: number;
        nightHours?: number;
        totalCreditedHours?: number;
        compType?: string;
      };

      if (!startingTime || !endingTime || teamMemberId == null || projectId == null) {
        res.status(400).json({ error: 'startingTime, endingTime, teamMemberId, and projectId are required' });
        return;
      }

      const start = new Date(startingTime);
      const end   = new Date(endingTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: 'startingTime and endingTime must be valid dates' });
        return;
      }
      if (end <= start) {
        res.status(400).json({ error: 'endingTime must be after startingTime' });
        return;
      }

      if (req.body.status !== undefined && !ALLOWED_STATUSES.includes(req.body.status)) {
        res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        return;
      }

      // When compType is USED, run the full usage-entry validation before saving
      if (typeof compType === 'string' && compType === 'USED') {
        const validation = await compensatoryTimeService.validateUsageEntry(
          Number(teamMemberId),
          Number(projectId),
          start,
          end,
        );
        if (!validation.valid) {
          res.status(422).json({ error: validation.error });
          return;
        }
      }

      const result = await compensatoryTimeService.create({
        startingTime: start,
        endingTime:   end,
        subject:      subject ?? '',
        teamMemberId: Number(teamMemberId),
        projectId:    Number(projectId),
        dayHours:     typeof dayHours === 'number' ? dayHours : 0,
        nightHours:   typeof nightHours === 'number' ? nightHours : 0,
        createdBy:    req.user?.email ?? 'unknown',
        ...(typeof totalCreditedHours === 'number' ? { totalCreditedHours } : {}),
        ...(typeof compType === 'string' && compType ? { compType } : {}),
      });

      res.status(201).json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to create compensatory time record' });
    }
  },
);

// --- GET /compensatory-time/ -------------------------------------------------
// Returns a paginated list of compensatory time records.
// Query params: page (default 1, min 1), limit (default 10, min 1, max 100)
router.get(
  '/',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawPage                    = (req as Request).query['page'];
      const rawLimit                   = (req as Request).query['limit'];
      const rawTeamMemberId            = (req as Request).query['teamMemberId'];
      const rawStatus                  = (req as Request).query['status'];
      const rawCompType                = (req as Request).query['compType'];
      const rawIncludeReportLevelSupId = (req as Request).query['includeReportLevelForSupId'];
      const teamMemberSearch    = (req as Request).query['teamMemberSearch']    as string | undefined;
      const projectSearch       = (req as Request).query['projectSearch']       as string | undefined;
      const subjectSearch       = (req as Request).query['subjectSearch']       as string | undefined;
      const rejectionReasonSearch = (req as Request).query['rejectionReasonSearch'] as string | undefined;
      const rawSortBy  = (req as Request).query['sortBy']  as string | undefined;
      const rawSortDir = (req as Request).query['sortDir'] as string | undefined;
      const VALID_SORT_COLS: string[] = ['createdDate', 'startingTime', 'endingTime', 'subject', 'status', 'totalCreditedHours', 'dayHours', 'nightHours'];
      const sortBy  = rawSortBy  && VALID_SORT_COLS.includes(rawSortBy)          ? rawSortBy  as SortableColumn : undefined;
      const sortDir = rawSortDir === 'asc' || rawSortDir === 'desc'              ? rawSortDir                   : undefined;
      const statuses        = rawStatus !== undefined
        ? (Array.isArray(rawStatus) ? rawStatus : [rawStatus]).map(String).filter(Boolean)
        : undefined;
      const compType        = rawCompType !== undefined ? String(rawCompType) : undefined;
      const includeReportLevelForSupId = rawIncludeReportLevelSupId !== undefined
        ? parseInt(String(rawIncludeReportLevelSupId), 10)
        : undefined;

      const page  = rawPage  !== undefined ? parseInt(String(rawPage),  10) : 1;
      const limit = rawLimit !== undefined ? parseInt(String(rawLimit), 10) : 10;

      if (isNaN(page) || page < 1) {
        res.status(400).json({ error: '`page` must be an integer >= 1' });
        return;
      }
      const isAdmin = req.user?.roles.includes('admin') ?? false;
      const maxLimit = isAdmin ? 200 : 100;

      if (isNaN(limit) || limit < 1 || limit > maxLimit) {
        res.status(400).json({ error: `\`limit\` must be an integer between 1 and ${maxLimit}` });
        return;
      }

      if (isAdmin) {
        // Admins: return all records; honour an optional teamMemberId filter if provided.
        const teamMemberId = rawTeamMemberId !== undefined
          ? parseInt(String(rawTeamMemberId), 10)
          : undefined;

        if (teamMemberId !== undefined && (isNaN(teamMemberId) || teamMemberId < 1)) {
          res.status(400).json({ error: '`teamMemberId` must be a positive integer' });
          return;
        }

        const countOptions = {
          ...(teamMemberId !== undefined ? { teamMemberId } : {}),
          ...(statuses !== undefined ? { statuses } : {}),
          ...(compType !== undefined ? { compType } : {}),
          ...(teamMemberSearch ? { teamMemberSearch } : {}),
          ...(projectSearch ? { projectSearch } : {}),
          ...(subjectSearch ? { subjectSearch } : {}),
          ...(rejectionReasonSearch ? { rejectionReasonSearch } : {}),
        };
        const [result, total] = await Promise.all([
          compensatoryTimeService.getAll({
            page,
            limit,
            ...countOptions,
            ...(includeReportLevelForSupId !== undefined && !isNaN(includeReportLevelForSupId) ? { includeReportLevelForSupId } : {}),
            ...(sortBy  ? { sortBy }  : {}),
            ...(sortDir ? { sortDir } : {}),
          }),
          countCompensatoryTimes(countOptions),
        ]);
        res.setHeader('X-Total-Count', String(total));
        res.json(result);
      } else {
        // Non-admins: must have a valid teamMemberId linked to their account.
        const teamMemberId = req.user?.teamMemberId;
        if (teamMemberId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }

        // If the caller explicitly passes their own teamMemberId, skip supervisedIds.
        const requestedId = rawTeamMemberId !== undefined ? parseInt(String(rawTeamMemberId), 10) : undefined;
        let teamMemberIds: number[];
        if (requestedId !== undefined && !isNaN(requestedId) && requestedId === teamMemberId) {
          teamMemberIds = [teamMemberId];
        } else {
          // Include records for this user AND any team members they supervise.
          const supervisedIds = await getTeamMemberIdsBySupervisor(teamMemberId);
          teamMemberIds = [teamMemberId, ...supervisedIds];
        }

        const countOptions = {
          teamMemberIds,
          ...(statuses !== undefined ? { statuses } : {}),
          ...(compType !== undefined ? { compType } : {}),
          ...(teamMemberSearch ? { teamMemberSearch } : {}),
          ...(projectSearch ? { projectSearch } : {}),
          ...(subjectSearch ? { subjectSearch } : {}),
          ...(rejectionReasonSearch ? { rejectionReasonSearch } : {}),
        };
        const [result, total] = await Promise.all([
          compensatoryTimeService.getAll({
            page,
            limit,
            ...countOptions,
            ...(includeReportLevelForSupId !== undefined && !isNaN(includeReportLevelForSupId) ? { includeReportLevelForSupId } : {}),
            ...(sortBy  ? { sortBy }  : {}),
            ...(sortDir ? { sortDir } : {}),
          }),
          countCompensatoryTimes(countOptions),
        ]);
        res.setHeader('X-Total-Count', String(total));
        res.json(result);
      }
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch compensatory time records' });
    }
  },
);

// --- GET /compensatory-time/balance ------------------------------------------
// Returns earnedHours, usedHours, balanceHours, and nightMultiplier for a team member.
// Query param: teamMemberId (required for admins; defaults to the authenticated user's own id)
router.get(
  '/balance',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawTeamMemberId = (req as Request).query['teamMemberId'];
      const isAdmin = req.user?.roles.includes('admin') ?? false;

      let teamMemberId: number;

      if (rawTeamMemberId !== undefined) {
        teamMemberId = parseInt(String(rawTeamMemberId), 10);
        if (isNaN(teamMemberId) || teamMemberId < 1) {
          res.status(400).json({ error: '`teamMemberId` must be a positive integer' });
          return;
        }
        if (!isAdmin && req.user?.teamMemberId !== teamMemberId) {
          res.status(403).json({ error: 'Not allowed: you can only view your own balance' });
          return;
        }
      } else {
        const selfId = req.user?.teamMemberId;
        if (selfId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }
        teamMemberId = selfId;
      }

      const result = await compensatoryTimeService.getBalance(teamMemberId);
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to calculate compensatory time balance' });
    }
  },
);

// --- POST /compensatory-time/validate-usage-entry ---------------------------
// Validates dates format, order, shift hours, and that requested hours <= APPROVED balance.
// Body: { teamMemberId, projectId, startingTime, endingTime }
router.post(
  '/validate-usage-entry',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamMemberId, projectId, startingTime, endingTime } = req.body as {
        teamMemberId: number;
        projectId: number;
        startingTime: string;
        endingTime: string;
      };

      if (teamMemberId == null || projectId == null || !startingTime || !endingTime) {
        res.status(400).json({ valid: false, error: 'teamMemberId, projectId, startingTime, and endingTime are required' });
        return;
      }

      const tmId   = Number(teamMemberId);
      const projId = Number(projectId);
      if (isNaN(tmId) || tmId < 1) {
        res.status(400).json({ valid: false, error: '`teamMemberId` must be a positive integer' });
        return;
      }
      if (isNaN(projId) || projId < 1) {
        res.status(400).json({ valid: false, error: '`projectId` must be a positive integer' });
        return;
      }

      const isAdmin = req.user?.roles.includes('admin') ?? false;
      if (!isAdmin && req.user?.teamMemberId !== tmId) {
        res.status(403).json({ valid: false, error: 'Not allowed: you can only validate your own records' });
        return;
      }

      const start = new Date(startingTime);
      const end   = new Date(endingTime);

      const result = await compensatoryTimeService.validateUsageEntry(tmId, projId, start, end);
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ valid: false, error: 'Failed to validate usage entry' });
    }
  },
);

// --- GET /compensatory-time/shift-details ------------------------------------
// Returns the shift details (dayOfWeek, startTime, endTime as integer hours)
// for the active assignment of a given team member on a given project.
// Query params: teamMemberId (required), projectId (required)
router.get(
  '/shift-details',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamMemberId, projectId } = (req as Request).query as Record<string, string>;

      if (!teamMemberId || !projectId) {
        res.status(400).json({ error: 'teamMemberId and projectId are required' });
        return;
      }

      const tmId   = parseInt(teamMemberId, 10);
      const projId = parseInt(projectId, 10);

      if (isNaN(tmId) || tmId < 1) {
        res.status(400).json({ error: '`teamMemberId` must be a positive integer' });
        return;
      }
      if (isNaN(projId) || projId < 1) {
        res.status(400).json({ error: '`projectId` must be a positive integer' });
        return;
      }

      const { getShiftDetailsForAssignment } = await import('../services/compensatoryTime/repository');
      const details = await getShiftDetailsForAssignment(tmId, projId);
      res.json(details ?? []);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch shift details' });
    }
  },
);

// --- GET /compensatory-time/hours-per-shift ----------------------------------
// Returns { dayHours, nightHours } for a given team member, project, and shift window.
// Query params: teamMemberId (required), projectId (required), startingTime (required), endingTime (required)
router.get(
  '/hours-per-shift',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamMemberId, projectId, startingTime, endingTime } = (req as Request).query as Record<string, string>;

      if (!teamMemberId || !projectId || !startingTime || !endingTime) {
        res.status(400).json({ error: 'teamMemberId, projectId, startingTime, and endingTime are required' });
        return;
      }

      const tmId  = parseInt(teamMemberId, 10);
      const projId = parseInt(projectId, 10);
      if (isNaN(tmId) || tmId < 1) {
        res.status(400).json({ error: '`teamMemberId` must be a positive integer' });
        return;
      }
      if (isNaN(projId) || projId < 1) {
        res.status(400).json({ error: '`projectId` must be a positive integer' });
        return;
      }

      // Accept ISO local datetime strings: YYYY-MM-DDTHH:MM with optional :SS and timezone offset
      const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?$/;
      if (!ISO_DATETIME.test(startingTime) || !ISO_DATETIME.test(endingTime)) {
        res.status(400).json({ error: 'startingTime and endingTime must be ISO datetime strings (e.g. 2026-05-07T15:00)' });
        return;
      }

      const start = new Date(startingTime);
      const end   = new Date(endingTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: 'startingTime and endingTime must be valid ISO datetime strings' });
        return;
      }
      if (end <= start) {
        res.status(400).json({ error: 'endingTime must be after startingTime' });
        return;
      }

      const overlaps = await compensatoryTimeService.checkShiftOverlap(tmId, projId, start, end);
      if (overlaps) {
        res.status(409).json({ error: 'The requested time window overlaps with the team member\'s assigned project shift' });
        return;
      }

      const result = await compensatoryTimeService.hoursPerShift(tmId, projId, start, end);
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to calculate hours per shift' });
    }
  },
);

// --- GET /compensatory-time/by-supervisor/:supervisorId/max-report-level -----
// Returns { maxDepth } — the maximum report level depth in the supervisor's
// full recursive subordinate hierarchy. Used to populate the Report Level
// filter dropdown on the approval-management page.
router.get(
  '/by-supervisor/:supervisorId/max-report-level',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = parseInt(String((req as Request).params['supervisorId']), 10);
      if (isNaN(supervisorId) || supervisorId < 1) {
        res.status(400).json({ error: '`supervisorId` must be a positive integer' });
        return;
      }

      const isAdmin = req.user?.roles.includes('admin') ?? false;
      if (!isAdmin) {
        const selfId = req.user?.teamMemberId;
        if (selfId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }
        if (selfId !== supervisorId) {
          res.status(403).json({ error: 'Not allowed: you can only view your own subordinates' });
          return;
        }
      }

      const { getReportLevelMapForSupervisor } = await import('../services/compensatoryTime/repository');
      const levelMap = await getReportLevelMapForSupervisor(supervisorId);
      let maxDepth = 0;
      for (const depth of levelMap.values()) {
        if (depth > maxDepth) maxDepth = depth;
      }
      res.json({ maxDepth });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch max report level depth' });
    }
  },
);

// --- GET /compensatory-time/by-supervisor/:supervisorId ----------------------
// Returns compensatory time records for ALL team members in the full recursive
// hierarchy under the given supervisor (unlimited depth).
// The supervisor's own records are NOT included.
// Supports the same query params as GET /: page, limit, status, compType, includeReportLevelForSupId
router.get(
  '/by-supervisor/:supervisorId',
  requirePermission('CompensatoryTime', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorId = parseInt(String((req as Request).params['supervisorId']), 10);
      if (isNaN(supervisorId) || supervisorId < 1) {
        res.status(400).json({ error: '`supervisorId` must be a positive integer' });
        return;
      }

      const isAdmin = req.user?.roles.includes('admin') ?? false;
      if (!isAdmin) {
        const selfId = req.user?.teamMemberId;
        if (selfId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }
        if (selfId !== supervisorId) {
          res.status(403).json({ error: 'Not allowed: you can only view your own subordinates' });
          return;
        }
      }

      const rawPage   = (req as Request).query['page'];
      const rawLimit  = (req as Request).query['limit'];
      const rawStatus = (req as Request).query['status'];
      const rawCompType = (req as Request).query['compType'];
      const rawIncludeReportLevelSupId = (req as Request).query['includeReportLevelForSupId'];
      const rawReportLevels = (req as Request).query['reportLevel'];
      const teamMemberSearch    = (req as Request).query['teamMemberSearch']    as string | undefined;
      const projectSearch       = (req as Request).query['projectSearch']       as string | undefined;
      const subjectSearch       = (req as Request).query['subjectSearch']       as string | undefined;
      const rejectionReasonSearch = (req as Request).query['rejectionReasonSearch'] as string | undefined;
      const rawSortBy  = (req as Request).query['sortBy']  as string | undefined;
      const rawSortDir = (req as Request).query['sortDir'] as string | undefined;
      const VALID_SORT_COLS_SUP: string[] = ['createdDate', 'startingTime', 'endingTime', 'subject', 'status', 'totalCreditedHours', 'dayHours', 'nightHours'];
      const sortBy  = rawSortBy  && VALID_SORT_COLS_SUP.includes(rawSortBy)  ? rawSortBy  as SortableColumn : undefined;
      const sortDir = rawSortDir === 'asc' || rawSortDir === 'desc'          ? rawSortDir                   : undefined;

      const page  = rawPage  !== undefined ? parseInt(String(rawPage),  10) : 1;
      const limit = rawLimit !== undefined ? parseInt(String(rawLimit), 10) : 10;

      if (isNaN(page) || page < 1) {
        res.status(400).json({ error: '`page` must be an integer >= 1' });
        return;
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({ error: '`limit` must be an integer between 1 and 100' });
        return;
      }

      const statuses = rawStatus !== undefined
        ? (Array.isArray(rawStatus) ? rawStatus : [rawStatus]).map(String).filter(Boolean)
        : undefined;
      const compType = rawCompType !== undefined ? String(rawCompType) : undefined;
      const reportLevelFilter = rawReportLevels !== undefined
        ? (Array.isArray(rawReportLevels) ? rawReportLevels : [rawReportLevels])
            .map((v) => parseInt(String(v), 10))
            .filter((n) => !isNaN(n))
        : undefined;
      const includeReportLevelForSupId = rawIncludeReportLevelSupId !== undefined
        ? parseInt(String(rawIncludeReportLevelSupId), 10)
        : undefined;

      // Fetch the full recursive subordinate list + depth map in one shot when a
      // report-level filter is active (we need depth to filter IDs).
      // Otherwise just fetch IDs (cheaper).
      let allSubordinateIds: number[];
      let reportLevelMap: Map<number, number> | undefined;

      if (reportLevelFilter !== undefined && reportLevelFilter.length > 0) {
        const { getReportLevelMapForSupervisor } = await import('../services/compensatoryTime/repository');
        reportLevelMap = await getReportLevelMapForSupervisor(supervisorId);
        allSubordinateIds = [...reportLevelMap.keys()];
      } else {
        allSubordinateIds = await getAllSubordinateIds(supervisorId);
      }

      // Apply report-level filter: keep only IDs whose depth is in the requested set.
      const teamMemberIds = (reportLevelFilter !== undefined && reportLevelFilter.length > 0 && reportLevelMap !== undefined)
        ? allSubordinateIds.filter((id) => {
            const lvl = (reportLevelMap as Map<number, number>).get(id) ?? -1;
            return reportLevelFilter.includes(lvl);
          })
        : allSubordinateIds;

      if (teamMemberIds.length === 0) {
        res.setHeader('X-Total-Count', '0');
        res.json([]);
        return;
      }

      const countOptions = {
        teamMemberIds,
        ...(statuses !== undefined ? { statuses } : {}),
        ...(compType !== undefined ? { compType } : {}),
        ...(teamMemberSearch ? { teamMemberSearch } : {}),
        ...(projectSearch ? { projectSearch } : {}),
        ...(subjectSearch ? { subjectSearch } : {}),
        ...(rejectionReasonSearch ? { rejectionReasonSearch } : {}),
      };

      // If we already have the level map (report-level filter was active), reuse it.
      // Otherwise pass includeReportLevelForSupId so the service fetches it.
      const effectiveIncludeReportLevelForSupId =
        reportLevelMap !== undefined ? supervisorId : includeReportLevelForSupId;

      const [result, total] = await Promise.all([
        compensatoryTimeService.getAll({
          page,
          limit,
          ...countOptions,
          ...(effectiveIncludeReportLevelForSupId !== undefined && !isNaN(effectiveIncludeReportLevelForSupId) ? { includeReportLevelForSupId: effectiveIncludeReportLevelForSupId } : {}),
          ...(sortBy  ? { sortBy }  : {}),
          ...(sortDir ? { sortDir } : {}),
        }),
        countCompensatoryTimes(countOptions),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch compensatory time records by supervisor' });
    }
  },
);

// --- PATCH /compensatory-time/:id --------------------------------------------
// Partially updates a compensatory time record.
// Body (all fields optional): { startingTime, endingTime, subject, projectId, status, compType }
// Admins can update any record; non-admins can only update their own.
router.patch(
  '/:id',
  requirePermission('CompensatoryTime', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const before = await compensatoryTimeService.getById(id);
      if (!before) {
        res.status(404).json({ error: 'Compensatory time record not found' });
        return;
      }

      const isAdmin = req.user?.roles.includes('admin') ?? false;
      if (!isAdmin) {
        const selfId = req.user?.teamMemberId;
        if (selfId === undefined) {
          res.status(403).json({ error: 'Not allowed: no team member profile associated with this account' });
          return;
        }
        // Non-admins may only update records that belong to their supervised team members.
        const supervisedIds = await getTeamMemberIdsBySupervisor(selfId);
        if (!supervisedIds.includes(before.teamMemberId)) {
          res.status(403).json({ error: 'Not allowed: you can only update compensatory time records of your supervised team members' });
          return;
        }
      }

      const body = req.body as Record<string, unknown>;
      const unsupported = Object.keys(body).filter((k) => k !== 'status' && k !== 'rejectionReason');
      if (unsupported.length > 0) {
        res.status(400).json({ error: 'Only status and rejectionReason can be updated' });
        return;
      }

      const { status, rejectionReason } = body as { status?: string; rejectionReason?: string };

      if (status === undefined) {
        res.status(400).json({ error: '`status` is required' });
        return;
      }

      if (!ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
        res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        return;
      }

      if (rejectionReason !== undefined && status !== 'REJECTED') {
        res.status(400).json({ error: '`rejectionReason` can only be set when status is REJECTED' });
        return;
      }

      if (rejectionReason !== undefined && typeof rejectionReason !== 'string') {
        res.status(400).json({ error: '`rejectionReason` must be a string' });
        return;
      }

      const updateData: { status: string; rejectionReason?: string } = { status };
      if (rejectionReason !== undefined) {
        updateData.rejectionReason = rejectionReason;
      }

      const result = await compensatoryTimeService.update(id, updateData);

      if (!result) {
        res.status(404).json({ error: 'Compensatory time record not found' });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'ct_compensatory_time',
        entityId:   String(id),
        createdBy:  req.user?.email ?? 'unknown',
        oldValues:  before as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    'Compensatory time record updated',
      });

      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to update compensatory time record' });
    }
  },
);

// --- DELETE /compensatory-time/:id -------------------------------------------
// Soft-deletes a compensatory time record (sets deleted = true).
router.delete(
  '/:id',
  requirePermission('CompensatoryTime', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const before = await compensatoryTimeService.getById(id);
      if (!before) {
        res.status(404).json({ error: 'Compensatory time record not found' });
        return;
      }

      if (before.status !== 'SUBMITTED') {
        res.status(409).json({ error: 'Only records with status SUBMITTED can be deleted' });
        return;
      }

      const isAdmin = req.user?.roles.includes('admin') ?? false;
      if (!isAdmin && before.teamMemberId !== req.user?.teamMemberId) {
        res.status(403).json({ error: 'Not allowed: you can only delete your own compensatory time records' });
        return;
      }

      const result = await compensatoryTimeService.delete(id);
      if (!result) {
        res.status(404).json({ error: 'Compensatory time record not found' });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'ct_compensatory_time',
        entityId: String(id),
        createdBy: (req as AuthenticatedRequest).user?.email ?? 'unknown',
        oldValues: before as unknown as Record<string, unknown>,
        newValues: result as unknown as Record<string, unknown>,
        comment: 'Compensatory time record soft-deleted',
      });

      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to delete compensatory time record' });
    }
  },
);

export default router;
