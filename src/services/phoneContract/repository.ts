import { Prisma } from '@prisma/client';
import type { CorporatePhoneLine, CorporatePhoneAssignment } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { utcToday } from './components/phoneContractDates';
import type {
  PhoneContractDTO,
  PhoneContractActiveAssignmentDTO,
} from '../../../shared/dto/PhoneContract';

// ---------------------------------------------------------------------------
// Shared include shape + derived Prisma payload type
// ---------------------------------------------------------------------------

const PHONE_LINE_INCLUDE = {
  phoneAssignments: {
    where:   { deleted: false, assignDateEnd: null },
    orderBy: { assignDateStart: 'desc' as const },
    take:    1,
    include: {
      teamMember: {
        select: { teamMemberNames: true, teamMemberSurnames: true },
      },
    },
  },
} satisfies Prisma.CorporatePhoneLineInclude;

export type PhoneLineRow = Prisma.CorporatePhoneLineGetPayload<{
  include: typeof PHONE_LINE_INCLUDE;
}>;

// Prisma transaction-client type (used by mutation helpers)
type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ---------------------------------------------------------------------------
// DTO mapper — single source of truth, eliminates 4× duplication
// ---------------------------------------------------------------------------

export function mapToDTO(row: PhoneLineRow, today: Date = utcToday()): PhoneContractDTO {
  const assignment = row.phoneAssignments[0] ?? null;

  let activeAssignment: PhoneContractActiveAssignmentDTO | null = null;
  if (assignment !== null) {
    activeAssignment = {
      phoneAssignmentId:  assignment.phoneAssignmentId,
      teamMemberId:       assignment.teamMemberId,
      teamMemberNames:    assignment.teamMember.teamMemberNames,
      teamMemberSurnames: assignment.teamMember.teamMemberSurnames,
      billRate:           Number(assignment.billRate),
      assignDateStart:    assignment.assignDateStart,
      billable:           assignment.billable,
      isFree:             assignment.isFree,
      remarks:            assignment.remarks,
      phoneType:          assignment.phoneType,
    };
  }

  return {
    phoneLineId:       row.phoneLineId,
    phoneNumber:       row.phoneNumber,
    contractStartDate: row.contractStartDate,
    contractEndDate:   row.contractEndDate,
    contractMonths:    row.contractMonths,
    renewalParentId:   row.renewalParentId,
    actualCostRate:    row.actualCostRate !== null ? Number(row.actualCostRate) : null,
    countryId:         row.countryId,
    comments:          row.comments,
    createdAt:         row.createdAt,
    updatedAt:         row.updatedAt,
    isActive:          row.contractEndDate === null || row.contractEndDate >= today,
    activeAssignment,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function findAllPhoneLines(): Promise<PhoneLineRow[]> {
  return prisma.corporatePhoneLine.findMany({
    where:   { deleted: false },
    include: PHONE_LINE_INCLUDE,
    orderBy: { phoneLineId: 'asc' },
  });
}

export async function findPhoneLineById(
  phoneLineId: number,
): Promise<CorporatePhoneLine | null> {
  return prisma.corporatePhoneLine.findFirst({
    where: { phoneLineId, deleted: false },
  });
}

export async function findPhoneLineWithAssignmentById(
  phoneLineId: number,
): Promise<PhoneLineRow | null> {
  return prisma.corporatePhoneLine.findFirst({
    where:   { phoneLineId, deleted: false },
    include: PHONE_LINE_INCLUDE,
  });
}

export async function findPhoneLineWithAssignmentOrThrow(
  phoneLineId: number,
): Promise<PhoneLineRow> {
  return prisma.corporatePhoneLine.findUniqueOrThrow({
    where:   { phoneLineId },
    include: PHONE_LINE_INCLUDE,
  });
}

export async function findActiveAssignment(
  phoneLineId: number,
): Promise<CorporatePhoneAssignment | null> {
  return prisma.corporatePhoneAssignment.findFirst({
    where:   { phoneLineId, deleted: false, assignDateEnd: null },
    orderBy: { assignDateStart: 'desc' },
  });
}

export async function findActiveAssignmentOrThrow(
  phoneAssignmentId: number,
): Promise<CorporatePhoneAssignment> {
  return prisma.corporatePhoneAssignment.findUniqueOrThrow({
    where: { phoneAssignmentId },
  });
}

export async function findManyPhoneLines(
  phoneLineIds: number[],
): Promise<CorporatePhoneLine[]> {
  return prisma.corporatePhoneLine.findMany({
    where: { phoneLineId: { in: phoneLineIds }, deleted: false },
  });
}

export async function findManyActiveAssignments(
  phoneLineIds: number[],
): Promise<CorporatePhoneAssignment[]> {
  return prisma.corporatePhoneAssignment.findMany({
    where: { phoneLineId: { in: phoneLineIds }, deleted: false, assignDateEnd: null },
  });
}

export async function findPhoneLinesWithAssignmentsByIds(
  phoneLineIds: number[],
): Promise<PhoneLineRow[]> {
  return prisma.corporatePhoneLine.findMany({
    where:   { phoneLineId: { in: phoneLineIds } },
    include: PHONE_LINE_INCLUDE,
    orderBy: { phoneLineId: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// Mutations (accept a Tx so orchestrator can wrap them in $transaction)
// ---------------------------------------------------------------------------

export async function insertPhoneLine(
  data: {
    phoneNumber:       string;
    contractStartDate: Date;
    contractEndDate:   Date | null;
    contractMonths:    number | null;
    actualCostRate:    number | null;
    countryId:         number | null;
    comments:          string | null;
    createdBy:         number;
    createdAt:         Date;
    renewalParentId?:  number | null;
  },
  tx: Tx,
): Promise<CorporatePhoneLine> {
  return tx.corporatePhoneLine.create({
    data: { ...data, deleted: false },
  });
}

export async function insertPhoneAssignment(
  data: {
    phoneLineId:     number;
    teamMemberId:    number;
    assignDateStart: Date;
    assignDateEnd:   Date | null;
    billable:        boolean;
    isFree:          boolean;
    billRate:        number;
    remarks:         string | null;
    phoneType:       string | null;
    createdBy:       number;
    createdAt:       Date;
  },
  tx: Tx,
): Promise<CorporatePhoneAssignment> {
  return tx.corporatePhoneAssignment.create({
    data: { ...data, deleted: false },
  });
}

export async function patchPhoneLine(
  phoneLineId: number,
  data:        Partial<{
    contractStartDate: Date;
    contractEndDate:   Date | null;
    contractMonths:    number | null;
    actualCostRate:    number | null;
    countryId:         number | null;
    comments:          string | null;
    updatedBy:         number;
    updatedAt:         Date;
  }>,
  tx: Tx,
): Promise<CorporatePhoneLine> {
  return tx.corporatePhoneLine.update({ where: { phoneLineId }, data });
}

export async function patchPhoneAssignment(
  phoneAssignmentId: number,
  data:              Partial<{
    assignDateEnd: Date | null;
    billRate:      number;
    billable:      boolean;
    isFree:        boolean;
    remarks:       string | null;
    phoneType:     string | null;
    updatedBy:     number;
    updatedAt:     Date;
    deleted:       boolean;
    deletedAt:     Date;
  }>,
  tx: Tx,
): Promise<CorporatePhoneAssignment> {
  return tx.corporatePhoneAssignment.update({ where: { phoneAssignmentId }, data });
}

export async function softDeletePhoneLine(
  phoneLineId: number,
  data:        { updatedBy: number; updatedAt: Date; deletedAt: Date },
  tx:          Tx,
): Promise<CorporatePhoneLine> {
  return tx.corporatePhoneLine.update({
    where: { phoneLineId },
    data:  { ...data, deleted: true },
  });
}

export async function softDeletePhoneAssignment(
  phoneAssignmentId: number,
  data:              { assignDateEnd: Date; updatedBy: number; updatedAt: Date; deletedAt: Date },
  tx:                Tx,
): Promise<CorporatePhoneAssignment> {
  return tx.corporatePhoneAssignment.update({
    where: { phoneAssignmentId },
    data:  { ...data, deleted: true },
  });
}
