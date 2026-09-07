import { queryPerformanceCaseReport } from './components/QueryPerformanceCaseReport';
import type { PerformanceCaseReportFilters } from './components/QueryPerformanceCaseReport';
import type { PerformanceCaseDTO } from '@shared/dto';

export class PerformanceCaseReportOrchestrator {
  async run(requestingTeamMemberId: number, filters: PerformanceCaseReportFilters): Promise<PerformanceCaseDTO[]> {
    return queryPerformanceCaseReport(requestingTeamMemberId, filters);
  }
}

export const performanceCaseReportOrchestrator = new PerformanceCaseReportOrchestrator();
