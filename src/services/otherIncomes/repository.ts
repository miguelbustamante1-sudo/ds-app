import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { OtherIncomeDTO, OtherIncomeStatus } from '@shared/dto/OtherIncome';
import { OtherIncomeNotFoundError, PayrolClosedError } from './errors';

export const TABLE = 'oin_other_incomes';

const includeRelations = {
  teamMember: {
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  },
  incomeType: {
    select: { incomeTypeId: true, incomeTypeName: true },
  },
  authorizer: {
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  },
  payrol: {
    select: { prlId: true, prlDescription: true, prlMonth: true, prlYear: true, prlStatus: true },
  },
} satisfies Prisma.OtherIncomeInclude;

type OtherIncomeWithRelations = Prisma.OtherIncomeGetPayload<{ include: typeof includeRelations }>;

function toDTO(r: OtherIncomeWithRelations): OtherIncomeDTO {
  return {
    oinId: r.oinId,
    teamMemberWdid: r.teamMemberWdid,
    incomeTypeId: r.incomeTypeId,
    oinAmount: r.oinAmount.toString(),
    oinCuantity: r.oinCuantity,
    oinMeasurment: r.oinMeasurment,
    authorizerWdid: r.authorizerWdid,
    payrolId: r.payrolId,
    oinStatus: r.oinStatus as OtherIncomeStatus,
    oinRejectionReason: r.oinRejectionReason,
    oinDecidedBy: r.oinDecidedBy,
    oinDecidedDate: r.oinDecidedDate ? r.oinDecidedDate.toISOString() : null,
    oinCreatedBy: r.oinCreatedBy,
    oinCreatedDate: r.oinCreatedDate.toISOString(),
    oinLastUpdatedBy: r.oinLastUpdatedBy,
    oinLastUpdatedDate: r.oinLastUpdatedDate ? r.oinLastUpdatedDate.toISOString() : null,
    teamMember: r.teamMember,
    incomeType: r.incomeType,
    authorizer: r.authorizer,
    payrol: r.payrol,
  };
}

export async function getAllOtherIncomes(where: Prisma.OtherIncomeWhereInput = {}): Promise<OtherIncomeDTO[]> {
  const results = await prisma.otherIncome.findMany({
    where: { ...where, oinDeletedAt: null },
    include: includeRelations,
    orderBy: { oinId: 'asc' },
  });
  return results.map(toDTO);
}

export async function getOtherIncomeById(id: number): Promise<OtherIncomeDTO | null> {
  const result = await prisma.otherIncome.findFirst({
    where: { oinId: id, oinDeletedAt: null },
    include: includeRelations,
  });
  return result ? toDTO(result) : null;
}

export async function createOtherIncome(
  payload: Prisma.OtherIncomeUncheckedCreateInput,
): Promise<OtherIncomeDTO> {
  const result = await prisma.otherIncome.create({ data: payload, include: includeRelations });
  return toDTO(result);
}

export async function updateOtherIncome(
  id: number,
  payload: Prisma.OtherIncomeUncheckedUpdateInput,
): Promise<OtherIncomeDTO> {
  const result = await prisma.otherIncome.update({ where: { oinId: id }, data: payload, include: includeRelations });
  return toDTO(result);
}

export async function softDeleteOtherIncome(id: number, deletedBy: number): Promise<OtherIncomeDTO> {
  const result = await prisma.otherIncome.update({
    where: { oinId: id },
    data: { oinDeletedAt: new Date(), oinLastUpdatedBy: deletedBy, oinLastUpdatedDate: new Date() },
    include: includeRelations,
  });
  return toDTO(result);
}

export async function getPayrolStatus(payrolId: number): Promise<string | null> {
  const payrol = await prisma.prlPayrol.findUnique({ where: { prlId: payrolId }, select: { prlStatus: true } });
  return payrol ? payrol.prlStatus : null;
}

export async function findActiveIncomeTypeByName(name: string): Promise<{ incomeTypeId: number } | null> {
  return prisma.incomeType.findFirst({
    where: { incomeTypeName: { equals: name, mode: 'insensitive' }, incomeTypeIsActive: true },
    select: { incomeTypeId: true },
  });
}

export async function findOpenPayrolByDescription(description: string): Promise<{ prlId: number } | null> {
  return prisma.prlPayrol.findFirst({
    where: { prlDescription: { equals: description, mode: 'insensitive' }, prlStatus: 'Open' },
    select: { prlId: true },
  });
}

export interface OpenPayrolPeriodOption {
  prlId: number;
  prlDescription: string;
  prlMonth: number;
  prlYear: number;
}

/**
 * Open-only payrol periods for the create-form ComboBox. `GET /api/payrol` is
 * gated by PayrollAdmin ('PayrolManagement' resource), which non-admin hierarchy
 * users creating an entry don't have — this gives them just enough to pick a period.
 */
export async function getOpenPayrolPeriods(): Promise<OpenPayrolPeriodOption[]> {
  return prisma.prlPayrol.findMany({
    where: { prlStatus: 'Open' },
    select: { prlId: true, prlDescription: true, prlMonth: true, prlYear: true },
    orderBy: { prlStartDate: 'desc' },
  });
}

export interface BulkSoftDeleteResult {
  before: OtherIncomeDTO;
  after: OtherIncomeDTO;
}

/**
 * Soft-deletes every id in one transaction. All-or-nothing: if any id is missing
 * (or already soft-deleted) or its linked payrol isn't Open, the whole transaction
 * rolls back and the offending id's error propagates.
 */
export async function bulkSoftDeleteOtherIncomes(
  ids: number[],
  deletedBy: number,
): Promise<BulkSoftDeleteResult[]> {
  return prisma.$transaction(async (tx) => {
    const results: BulkSoftDeleteResult[] = [];

    for (const id of ids) {
      const existing = await tx.otherIncome.findFirst({
        where: { oinId: id, oinDeletedAt: null },
        include: includeRelations,
      });
      if (!existing) {
        throw new OtherIncomeNotFoundError();
      }

      const payrol = await tx.prlPayrol.findUnique({ where: { prlId: existing.payrolId }, select: { prlStatus: true } });
      if (!payrol || payrol.prlStatus !== 'Open') {
        throw new PayrolClosedError();
      }

      const updated = await tx.otherIncome.update({
        where: { oinId: id },
        data: { oinDeletedAt: new Date(), oinLastUpdatedBy: deletedBy, oinLastUpdatedDate: new Date() },
        include: includeRelations,
      });

      results.push({ before: toDTO(existing), after: toDTO(updated) });
    }

    return results;
  });
}
