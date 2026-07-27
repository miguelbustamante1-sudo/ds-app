import { getReports } from '../../teamMember/queries/getReports';
import { AppError } from '../../../errors/AppError';

export class NotYourReportError extends AppError {
  constructor() {
    super('This team member is not in your reporting hierarchy', 403);
    this.name = 'NotYourReportError';
  }
}

export async function validateIsMyReport(supervisorId: number, teamMemberId: number): Promise<void> {
  const reports = await getReports(supervisorId, true);
  const isReport = reports.some((r) => r.teamMemberId === teamMemberId);
  if (!isReport) throw new NotYourReportError();
}
