import { prisma } from '../../../../db/prisma';
import { getReportsForPerformanceReview } from '../../../teamMember/queries/getReportsForPerformanceReview';
import { toPerformanceCaseDTO } from '../../../performance-cases/mappers';
import { AppError } from '../../../../errors/AppError';
import type { Prisma } from '@prisma/client';
import type { PerformanceCaseDTO } from '@shared/dto';

export interface PerformanceCaseReportFilters {
  dateField?: 'createdDate' | 'closureSignoffDate';
  dateFrom?: string;
  dateTo?: string;
  severityTier?: string;
  currentPhase?: string;
  caseStatus?: string;
  rcaType?: string;
  teamLeaderId?: number;
}

export async function queryPerformanceCaseReport(
  requestingTeamMemberId: number,
  filters: PerformanceCaseReportFilters,
): Promise<PerformanceCaseDTO[]> {
  const inScopeIds = [requestingTeamMemberId, ...(await getReportsForPerformanceReview(requestingTeamMemberId))];

  if (filters.teamLeaderId && !inScopeIds.includes(filters.teamLeaderId)) {
    throw new AppError('Team leader is not in your reporting chain', 403);
  }

  const where: Prisma.PerformanceCaseWhereInput = {
    teamLeaderId: filters.teamLeaderId ?? { in: inScopeIds },
    ...(filters.severityTier ? { severityTier: filters.severityTier } : {}),
    ...(filters.currentPhase ? { currentPhase: filters.currentPhase } : {}),
    ...(filters.caseStatus ? { caseStatus: filters.caseStatus } : {}),
    ...(filters.rcaType ? { rcaType: filters.rcaType } : {}),
  };

  // Restructured as an explicit if/else per field (rather than a dynamic `where[field] = ...`
  // index write) because TS rejects assigning through a union-keyed index into the generated
  // Prisma where-type here: `createdDate` and `closureSignoffDate` resolve to different
  // filter types (non-nullable vs. nullable DateTime filter) and the write is not assignable
  // to the naive union of the two.
  if (filters.dateFrom || filters.dateTo) {
    const range = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
    if (filters.dateField === 'closureSignoffDate') {
      where.closureSignoffDate = range;
    } else {
      where.createdDate = range;
    }
  }

  const rows = await prisma.performanceCase.findMany({ where, orderBy: { createdDate: 'desc' } });
  return rows.map(toPerformanceCaseDTO);
}
