import { prisma } from '../../../db/prisma';
import type {
  CorporatePhoneAssignmentReportQueryDTO,
  CorporatePhoneAssignmentReportRowDTO,
} from '@shared/dto';

interface RawReportRow {
  effective_month: string;
  description: string;
  pr_id: string | null;
  pr_name: string | null;
  project_manager: string | null;
  tm_country: string | null;
  bill_rate: string;
  wdid: string | null;
  billable: string;
  remarks: string | null;
  phone_number: string;
  created_by: string;
  actual_cost: string | null;
}

export async function getCorporatePhoneAssignmentsReport(
  params: CorporatePhoneAssignmentReportQueryDTO,
): Promise<CorporatePhoneAssignmentReportRowDTO[]> {
  const startDate = params.startDate ?? null;
  const endDate = params.endDate ?? null;
  const projectIds = params.projectIds ?? null;
  const projectManager = params.projectManager ?? null;

  const rows = await prisma.$queryRaw<RawReportRow[]>`
    SELECT * FROM ds.fn_corporate_phone_assignments_report(
      ${startDate}, ${endDate}, ${projectIds}, ${projectManager}
    )
  `;

  return rows.map((row) => ({
    effectiveMonth: row.effective_month,
    description: row.description,
    prId: row.pr_id,
    prName: row.pr_name,
    projectManager: row.project_manager,
    tmCountry: row.tm_country,
    billRate: Number(row.bill_rate),
    wdid: row.wdid,
    billable: row.billable,
    remarks: row.remarks,
    phoneNumber: row.phone_number,
    createdBy: row.created_by,
    actualCost: row.actual_cost === null ? null : Number(row.actual_cost),
  }));
}
