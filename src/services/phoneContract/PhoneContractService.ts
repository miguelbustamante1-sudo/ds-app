import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type { CorporatePhoneLine, CorporatePhoneAssignment } from '@prisma/client';
import type { PhoneContractDTO, CreatePhoneContractDTO, UpdatePhoneContractDTO, RenewPhoneContractsDTO } from '../../../shared/dto/PhoneContract';

export async function listPhoneContracts(): Promise<PhoneContractDTO[]> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const rows = await prisma.corporatePhoneLine.findMany({
    where: { deleted: false },
    include: {
      phoneAssignments: {
        where: { deleted: false, assignDateEnd: null },
        orderBy: { assignDateStart: 'desc' },
        take: 1,
        include: {
          teamMember: {
            select: {
              teamMemberNames: true,
              teamMemberSurnames: true,
            },
          },
        },
      },
    },
    orderBy: { phoneLineId: 'asc' },
  });

  return rows.map((row) => {
    const assignment = row.phoneAssignments[0] ?? null;
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
      activeAssignment:  assignment
        ? {
            phoneAssignmentId: assignment.phoneAssignmentId,
            teamMemberId:      assignment.teamMemberId,
            teamMemberNames:   assignment.teamMember.teamMemberNames,
            teamMemberSurnames: assignment.teamMember.teamMemberSurnames,
            billRate:          Number(assignment.billRate),
            assignDateStart:   assignment.assignDateStart,
            billable:          assignment.billable,
            remarks:           assignment.remarks,
          }
        : null,
    };
  });
}

export async function createPhoneContract(
  dto: CreatePhoneContractDTO,
  createdBy: number,
  createdByEmail: string,
): Promise<PhoneContractDTO> {
  if (dto.contractMonths != null && dto.contractMonths < 1) {
    throw new AppError('Contract months must be 1 or more', 400);
  }

  // Parse as UTC midnight — ISO date strings are UTC by spec, safe for @db.Date fields
  const contractStart = new Date(dto.contractStartDate + 'T00:00:00.000Z');

  let contractEndDate: Date | null = null;
  if (dto.contractMonths != null && dto.contractMonths > 0) {
    const year  = parseInt(dto.contractStartDate.slice(0, 4), 10);
    const month = parseInt(dto.contractStartDate.slice(5, 7), 10);
    const day   = parseInt(dto.contractStartDate.slice(8, 10), 10);
    contractEndDate = new Date(Date.UTC(year, month - 1 + dto.contractMonths, day - 1));
  }

  const now = new Date();

  const { line, assign } = await prisma.$transaction(async (tx) => {
    const line = await tx.corporatePhoneLine.create({
      data: {
        phoneNumber:       dto.phoneNumber.trim(),
        contractStartDate: contractStart,
        contractEndDate,
        contractMonths:    dto.contractMonths ?? null,
        actualCostRate:    dto.actualCostRate ?? null,
        countryId:         dto.countryId ?? null,
        comments:          dto.comments?.trim() ?? null,
        deleted:           false,
        createdBy,
        createdAt:         now,
      },
    });

    const assign = await tx.corporatePhoneAssignment.create({
      data: {
        phoneLineId:     line.phoneLineId,
        teamMemberId:    dto.teamMemberId,
        assignDateStart: contractStart,
        assignDateEnd:   null,
        billable:        dto.billable,
        billRate:        dto.billRate,
        remarks:         dto.remarks?.trim() ?? null,
        deleted:         false,
        createdBy,
        createdAt:       now,
      },
    });

    return { line, assign };
  });

  const row = await prisma.corporatePhoneLine.findUniqueOrThrow({
    where: { phoneLineId: line.phoneLineId },
    include: {
      phoneAssignments: {
        where: { deleted: false, assignDateEnd: null },
        orderBy: { assignDateStart: 'desc' },
        take: 1,
        include: {
          teamMember: {
            select: { teamMemberNames: true, teamMemberSurnames: true },
          },
        },
      },
    },
  });

  await auditOrchestrator.log({
    entityName: 'cpl_corporate_phone_lines',
    entityId:   String(line.phoneLineId),
    createdBy:  createdByEmail,
    oldValues:  null,
    newValues:  line as unknown as Record<string, unknown>,
    comment:    `Phone contract created for ${dto.phoneNumber}`,
  });

  await auditOrchestrator.log({
    entityName: 'cpa_corporate_phone_assignments',
    entityId:   String(assign.phoneAssignmentId),
    createdBy:  createdByEmail,
    oldValues:  null,
    newValues:  assign as unknown as Record<string, unknown>,
    comment:    `Phone assignment created for team member ID ${dto.teamMemberId}`,
  });

  const activeAssignment = row.phoneAssignments[0] ?? null;
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
    isActive:          row.contractEndDate === null || row.contractEndDate >= today0,
    activeAssignment: activeAssignment
      ? {
          phoneAssignmentId:  activeAssignment.phoneAssignmentId,
          teamMemberId:       activeAssignment.teamMemberId,
          teamMemberNames:    activeAssignment.teamMember.teamMemberNames,
          teamMemberSurnames: activeAssignment.teamMember.teamMemberSurnames,
          billRate:           Number(activeAssignment.billRate),
          assignDateStart:    activeAssignment.assignDateStart,
          billable:           activeAssignment.billable,
          remarks:            activeAssignment.remarks,
        }
      : null,
  };
}

export async function updatePhoneContract(
  phoneLineId: number,
  dto: UpdatePhoneContractDTO,
  updatedBy: number,
  updatedByEmail: string,
): Promise<PhoneContractDTO> {
  if (dto.contractMonths != null && dto.contractMonths < 1) {
    throw new AppError('Contract months must be 1 or more', 400);
  }

  if (dto.phoneNumber !== undefined) {
    throw new AppError('Phone number cannot be changed after creation', 400);
  }

  const phoneLine = await prisma.corporatePhoneLine.findFirst({
    where: { phoneLineId, deleted: false },
  });
  if (!phoneLine) throw new AppError('Phone contract not found', 404);

  const activeAssignment = await prisma.corporatePhoneAssignment.findFirst({
    where: { phoneLineId, deleted: false, assignDateEnd: null },
    orderBy: { assignDateStart: 'desc' },
  });

  // Effective values for contractEndDate recalculation
  const effectiveStartStr =
    dto.contractStartDate ??
    (phoneLine.contractStartDate ? phoneLine.contractStartDate.toISOString().slice(0, 10) : null);

  const effectiveMonths =
    dto.contractMonths !== undefined ? dto.contractMonths : phoneLine.contractMonths;

  let contractEndDate: Date | null = null;
  if (effectiveStartStr != null && effectiveMonths != null && effectiveMonths >= 1) {
    const year  = parseInt(effectiveStartStr.slice(0, 4), 10);
    const month = parseInt(effectiveStartStr.slice(5, 7), 10);
    const day   = parseInt(effectiveStartStr.slice(8, 10), 10);
    contractEndDate = new Date(Date.UTC(year, month - 1 + effectiveMonths, day - 1));
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const needsAssignmentRotation =
    activeAssignment !== null && (
      (dto.teamMemberId !== undefined && dto.teamMemberId !== activeAssignment.teamMemberId) ||
      (dto.billRate !== undefined && Number(dto.billRate) !== Number(activeAssignment.billRate)) ||
      (dto.billable !== undefined && dto.billable !== activeAssignment.billable)
    );

  let remarksOnlyAssign: CorporatePhoneAssignment | null = null;

  const { updatedLine, newAssign } = await prisma.$transaction(async (tx) => {
    const updatedLine = await tx.corporatePhoneLine.update({
      where: { phoneLineId },
      data: {
        ...(dto.phoneNumber !== undefined    && { phoneNumber: dto.phoneNumber.trim() }),
        ...(dto.contractStartDate !== undefined && {
          contractStartDate: new Date(dto.contractStartDate + 'T00:00:00.000Z'),
        }),
        contractEndDate,
        ...(dto.contractMonths !== undefined  && { contractMonths: dto.contractMonths }),
        ...(dto.actualCostRate !== undefined  && { actualCostRate: dto.actualCostRate }),
        ...(dto.countryId !== undefined       && { countryId: dto.countryId }),
        ...(dto.comments !== undefined        && { comments: dto.comments?.trim() ?? null }),
        updatedAt: now,
        updatedBy,
      },
    });

    if (!needsAssignmentRotation || activeAssignment === null) {
      if (activeAssignment !== null && dto.remarks !== undefined) {
        remarksOnlyAssign = await tx.corporatePhoneAssignment.update({
          where: { phoneAssignmentId: activeAssignment.phoneAssignmentId },
          data: { remarks: dto.remarks?.trim() ?? null, updatedAt: now, updatedBy },
        });
      }
      return { updatedLine, newAssign: null };
    }

    await tx.corporatePhoneAssignment.update({
      where: { phoneAssignmentId: activeAssignment.phoneAssignmentId },
      data: { assignDateEnd: today, updatedAt: now, updatedBy },
    });

    const newAssign = await tx.corporatePhoneAssignment.create({
      data: {
        phoneLineId,
        teamMemberId:    dto.teamMemberId    ?? activeAssignment.teamMemberId,
        assignDateStart: today,
        assignDateEnd:   null,
        billable:        dto.billable        ?? activeAssignment.billable,
        billRate:        dto.billRate        ?? Number(activeAssignment.billRate),
        remarks:         dto.remarks !== undefined ? (dto.remarks?.trim() ?? null) : activeAssignment.remarks,
        deleted:         false,
        createdBy:       updatedBy,
        createdAt:       now,
      },
    });

    return { updatedLine, newAssign };
  });

  await auditOrchestrator.log({
    entityName: 'cpl_corporate_phone_lines',
    entityId:   String(phoneLineId),
    createdBy:  updatedByEmail,
    oldValues:  phoneLine as unknown as Record<string, unknown>,
    newValues:  updatedLine as unknown as Record<string, unknown>,
    comment:    `Phone contract ${phoneLine.phoneNumber} updated`,
  });

  if (remarksOnlyAssign !== null && activeAssignment !== null) {
    await auditOrchestrator.log({
      entityName: 'cpa_corporate_phone_assignments',
      entityId:   String(activeAssignment.phoneAssignmentId),
      createdBy:  updatedByEmail,
      oldValues:  activeAssignment as unknown as Record<string, unknown>,
      newValues:  remarksOnlyAssign as unknown as Record<string, unknown>,
      comment:    `Phone assignment remarks updated`,
    });
  }

  if (needsAssignmentRotation && activeAssignment !== null) {
    await auditOrchestrator.log({
      entityName: 'cpa_corporate_phone_assignments',
      entityId:   String(activeAssignment.phoneAssignmentId),
      createdBy:  updatedByEmail,
      oldValues:  activeAssignment as unknown as Record<string, unknown>,
      newValues:  {
        ...activeAssignment,
        assignDateEnd: today,
        updatedAt:     now,
        updatedBy,
      } as unknown as Record<string, unknown>,
      comment:    `Phone assignment closed; team member reassigned`,
    });
  }

  if (newAssign !== null) {
    await auditOrchestrator.log({
      entityName: 'cpa_corporate_phone_assignments',
      entityId:   String(newAssign.phoneAssignmentId),
      createdBy:  updatedByEmail,
      oldValues:  null,
      newValues:  newAssign as unknown as Record<string, unknown>,
      comment:    `New phone assignment created for team member ID ${newAssign.teamMemberId}`,
    });
  }

  const row = await prisma.corporatePhoneLine.findUniqueOrThrow({
    where: { phoneLineId },
    include: {
      phoneAssignments: {
        where: { deleted: false, assignDateEnd: null },
        orderBy: { assignDateStart: 'desc' },
        take: 1,
        include: {
          teamMember: {
            select: { teamMemberNames: true, teamMemberSurnames: true },
          },
        },
      },
    },
  });

  const activeAss = row.phoneAssignments[0] ?? null;
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
    isActive:          row.contractEndDate === null || row.contractEndDate >= today0,
    activeAssignment: activeAss
      ? {
          phoneAssignmentId:  activeAss.phoneAssignmentId,
          teamMemberId:       activeAss.teamMemberId,
          teamMemberNames:    activeAss.teamMember.teamMemberNames,
          teamMemberSurnames: activeAss.teamMember.teamMemberSurnames,
          billRate:           Number(activeAss.billRate),
          assignDateStart:    activeAss.assignDateStart,
          billable:           activeAss.billable,
          remarks:            activeAss.remarks,
        }
      : null,
  };
}

export async function renewPhoneContracts(
  dto: RenewPhoneContractsDTO,
  updatedBy: number,
  updatedByEmail: string,
): Promise<PhoneContractDTO[]> {
  if (dto.phoneLineIds.length === 0) {
    throw new AppError('At least one phone contract ID is required', 400);
  }

  const year  = parseInt(dto.newStartDate.slice(0, 4), 10);
  const month = parseInt(dto.newStartDate.slice(5, 7), 10);
  const day   = parseInt(dto.newStartDate.slice(8, 10), 10);

  const newStart = new Date(Date.UTC(year, month - 1, day));
  const oldEnd   = new Date(Date.UTC(year, month - 1, day - 1));
  const now      = new Date();

  const existing = await prisma.corporatePhoneLine.findMany({
    where: { phoneLineId: { in: dto.phoneLineIds }, deleted: false },
  });

  if (existing.length !== dto.phoneLineIds.length) {
    const foundIds = new Set(existing.map((c) => c.phoneLineId));
    const missing  = dto.phoneLineIds.filter((id) => !foundIds.has(id));
    throw new AppError(`Phone contract(s) not found or inactive: ${missing.join(', ')}`, 404);
  }

  const existingAssignments = await prisma.corporatePhoneAssignment.findMany({
    where: { phoneLineId: { in: dto.phoneLineIds }, deleted: false, assignDateEnd: null },
  });

  const assignmentByLineId = new Map(existingAssignments.map((a) => [a.phoneLineId, a]));

  const { lines: createdLines, assignments: createdAssignments } = await prisma.$transaction(async (tx) => {
    const lines: CorporatePhoneLine[] = [];
    const assignments: CorporatePhoneAssignment[] = [];

    for (const contract of existing) {
      const newContractEnd =
        contract.contractMonths != null && contract.contractMonths >= 1
          ? new Date(Date.UTC(year, month - 1 + contract.contractMonths, day))
          : null;

      await tx.corporatePhoneLine.update({
        where: { phoneLineId: contract.phoneLineId },
        data: { contractEndDate: oldEnd, updatedAt: now, updatedBy },
      });

      const newLine = await tx.corporatePhoneLine.create({
        data: {
          phoneNumber:       contract.phoneNumber,
          contractStartDate: newStart,
          contractEndDate:   newContractEnd,
          contractMonths:    contract.contractMonths,
          actualCostRate:    contract.actualCostRate,
          countryId:         contract.countryId,
          comments:          contract.comments,
          renewalParentId:   contract.phoneLineId,
          deleted:           false,
          createdBy:         updatedBy,
          createdAt:         now,
        },
      });

      lines.push(newLine);

      const oldAssignment = assignmentByLineId.get(contract.phoneLineId);
      if (oldAssignment) {
        const newAssignment = await tx.corporatePhoneAssignment.create({
          data: {
            phoneLineId:     newLine.phoneLineId,
            teamMemberId:    oldAssignment.teamMemberId,
            billRate:        oldAssignment.billRate,
            billable:        oldAssignment.billable,
            remarks:         oldAssignment.remarks,
            assignDateStart: newStart,
            assignDateEnd:   null,
            deleted:         false,
            createdBy:       updatedBy,
            createdAt:       now,
          },
        });
        assignments.push(newAssignment);
      }
    }

    return { lines, assignments };
  });

  for (let i = 0; i < existing.length; i++) {
    // safe: loop is bounded by existing.length; createdLines has one entry per contract by transaction construction
    const old     = existing[i]!;
    const newLine = createdLines[i]!;

    await auditOrchestrator.log({
      entityName: 'cpl_corporate_phone_lines',
      entityId:   String(old.phoneLineId),
      createdBy:  updatedByEmail,
      oldValues:  old as unknown as Record<string, unknown>,
      newValues:  { ...old, contractEndDate: oldEnd, updatedAt: now, updatedBy } as unknown as Record<string, unknown>,
      comment:    `Phone contract ${old.phoneNumber} renewed; end date set to ${oldEnd.toISOString().slice(0, 10)}`,
    });

    await auditOrchestrator.log({
      entityName: 'cpl_corporate_phone_lines',
      entityId:   String(newLine.phoneLineId),
      createdBy:  updatedByEmail,
      oldValues:  null,
      newValues:  newLine as unknown as Record<string, unknown>,
      comment:    `Phone contract ${newLine.phoneNumber} created as renewal of contract ID ${old.phoneLineId}`,
    });
  }

  for (const newAssignment of createdAssignments) {
    await auditOrchestrator.log({
      entityName: 'cpa_corporate_phone_assignments',
      entityId:   String(newAssignment.phoneAssignmentId),
      createdBy:  updatedByEmail,
      oldValues:  null,
      newValues:  newAssignment as unknown as Record<string, unknown>,
      comment:    `Phone assignment created for team member ID ${newAssignment.teamMemberId} on renewed contract`,
    });
  }

  const rows = await prisma.corporatePhoneLine.findMany({
    where:   { phoneLineId: { in: createdLines.map((l: CorporatePhoneLine) => l.phoneLineId) } },
    include: {
      phoneAssignments: {
        where:   { deleted: false, assignDateEnd: null },
        orderBy: { assignDateStart: 'desc' },
        take:    1,
        include: {
          teamMember: {
            select: { teamMemberNames: true, teamMemberSurnames: true },
          },
        },
      },
    },
    orderBy: { phoneLineId: 'asc' },
  });

  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return rows.map((row) => {
    const assignment = row.phoneAssignments[0] ?? null;
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
      isActive:          row.contractEndDate === null || row.contractEndDate >= today0,
      activeAssignment:  assignment
        ? {
            phoneAssignmentId:  assignment.phoneAssignmentId,
            teamMemberId:       assignment.teamMemberId,
            teamMemberNames:    assignment.teamMember.teamMemberNames,
            teamMemberSurnames: assignment.teamMember.teamMemberSurnames,
            billRate:           Number(assignment.billRate),
            assignDateStart:    assignment.assignDateStart,
            billable:           assignment.billable,
            remarks:            assignment.remarks,
          }
        : null,
    };
  });
}

export async function deletePhoneContract(
  phoneLineId: number,
  updatedBy: number,
  createdBy: string,
): Promise<void> {
  const phoneLine = await prisma.corporatePhoneLine.findFirst({
    where: { phoneLineId, deleted: false },
  });
  if (!phoneLine) {
    throw new AppError('Phone contract not found', 404);
  }

  const activeAssignment = await prisma.corporatePhoneAssignment.findFirst({
    where: { phoneLineId, deleted: false, assignDateEnd: null },
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.corporatePhoneLine.update({
      where: { phoneLineId },
      data: { deleted: true, deletedAt: now, updatedAt: now, updatedBy },
    });

    if (activeAssignment) {
      await tx.corporatePhoneAssignment.update({
        where: { phoneAssignmentId: activeAssignment.phoneAssignmentId },
        data: { deleted: true, deletedAt: now, assignDateEnd: now, updatedAt: now, updatedBy },
      });
    }
  });

  await auditOrchestrator.log({
    entityName: 'cpl_corporate_phone_lines',
    entityId:   String(phoneLineId),
    createdBy,
    oldValues:  phoneLine as unknown as Record<string, unknown>,
    newValues:  null,
    comment:    'Phone contract soft-deleted; active assignment closed',
  });
}
