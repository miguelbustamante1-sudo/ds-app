import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { computeContractEnd, utcToday } from './components/phoneContractDates';
import {
  findAllPhoneLines,
  findPhoneLineById,
  findPhoneLineWithAssignmentOrThrow,
  findActiveAssignment,
  findManyPhoneLines,
  findManyActiveAssignments,
  findPhoneLinesWithAssignmentsByIds,
  insertPhoneLine,
  insertPhoneAssignment,
  patchPhoneLine,
  patchPhoneAssignment,
  softDeletePhoneLine,
  softDeletePhoneAssignment,
  mapToDTO,
} from './repository';
import type {
  PhoneContractDTO,
  CreatePhoneContractDTO,
  UpdatePhoneContractDTO,
  RenewPhoneContractsDTO,
} from '../../../shared/dto/PhoneContract';
import type { CorporatePhoneLine, CorporatePhoneAssignment } from '@prisma/client';

export class PhoneContractOrchestrator {

  async list(): Promise<PhoneContractDTO[]> {
    const today = utcToday();
    const rows = await findAllPhoneLines();
    return rows.map((row) => mapToDTO(row, today));
  }

  async create(
    dto:            CreatePhoneContractDTO,
    createdBy:      number,
    createdByEmail: string,
  ): Promise<PhoneContractDTO> {
    if (dto.contractMonths != null && dto.contractMonths < 1) {
      throw new AppError('Contract months must be 1 or more', 400);
    }

    const contractStart = new Date(dto.contractStartDate + 'T00:00:00.000Z');
    const contractEndDate: Date | null =
      dto.contractMonths != null && dto.contractMonths > 0
        ? computeContractEnd(dto.contractStartDate, dto.contractMonths)
        : null;

    const now = new Date();

    const { line, assign } = await prisma.$transaction(async (tx) => {
      const line = await insertPhoneLine(
        {
          phoneNumber:       dto.phoneNumber.trim(),
          contractStartDate: contractStart,
          contractEndDate,
          contractMonths:    dto.contractMonths ?? null,
          actualCostRate:    dto.actualCostRate ?? null,
          countryId:         dto.countryId ?? null,
          comments:          dto.comments?.trim() ?? null,
          createdBy,
          createdAt:         now,
        },
        tx,
      );

      const assign = await insertPhoneAssignment(
        {
          phoneLineId:     line.phoneLineId,
          teamMemberId:    dto.teamMemberId,
          assignDateStart: contractStart,
          assignDateEnd:   null,
          billable:        dto.billable,
          isFree:          dto.isFree,
          billRate:        dto.billRate,
          remarks:         dto.remarks?.trim() ?? null,
          phoneType:       dto.phoneType?.trim() ?? null,
          createdBy,
          createdAt:       now,
        },
        tx,
      );

      return { line, assign };
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

    const row = await findPhoneLineWithAssignmentOrThrow(line.phoneLineId);
    return mapToDTO(row, utcToday());
  }

  async update(
    phoneLineId:    number,
    dto:            UpdatePhoneContractDTO,
    updatedBy:      number,
    updatedByEmail: string,
  ): Promise<PhoneContractDTO> {
    if (dto.contractMonths != null && dto.contractMonths < 1) {
      throw new AppError('Contract months must be 1 or more', 400);
    }
    if (dto.phoneNumber !== undefined) {
      throw new AppError('Phone number cannot be changed after creation', 400);
    }

    const phoneLine = await findPhoneLineById(phoneLineId);
    if (!phoneLine) throw new AppError('Phone contract not found', 404);

    const activeAssignment = await findActiveAssignment(phoneLineId);

    // Only recompute contractEndDate when the inputs that drive it actually changed
    let contractEndDate: Date | null | undefined = undefined;
    if (dto.contractStartDate !== undefined || dto.contractMonths !== undefined) {
      const effectiveStartStr =
        dto.contractStartDate ??
        (phoneLine.contractStartDate
          ? phoneLine.contractStartDate.toISOString().slice(0, 10)
          : null);
      const effectiveMonths =
        dto.contractMonths !== undefined ? dto.contractMonths : phoneLine.contractMonths;

      contractEndDate = null;
      if (effectiveStartStr != null && effectiveMonths != null && effectiveMonths >= 1) {
        contractEndDate = computeContractEnd(effectiveStartStr, effectiveMonths);
      }
    }

    const now   = new Date();
    const today = utcToday();

    const needsAssignmentRotation =
      activeAssignment !== null &&
      ((dto.teamMemberId !== undefined && dto.teamMemberId !== activeAssignment.teamMemberId) ||
        (dto.billRate !== undefined &&
          Number(dto.billRate) !== Number(activeAssignment.billRate)) ||
        (dto.billable !== undefined && dto.billable !== activeAssignment.billable) ||
        (dto.isFree !== undefined && dto.isFree !== activeAssignment.isFree));

    let remarksOnlyAssign: CorporatePhoneAssignment | null = null;
    let newAssign: CorporatePhoneAssignment | null         = null;

    const { updatedLine } = await prisma.$transaction(async (tx) => {
      const lineData: Parameters<typeof patchPhoneLine>[1] = {
        ...(dto.contractStartDate !== undefined && {
          contractStartDate: new Date(dto.contractStartDate + 'T00:00:00.000Z'),
        }),
        ...(contractEndDate !== undefined && { contractEndDate }),
        ...(dto.contractMonths !== undefined  && { contractMonths: dto.contractMonths }),
        ...(dto.actualCostRate !== undefined  && { actualCostRate: dto.actualCostRate }),
        ...(dto.countryId !== undefined       && { countryId: dto.countryId }),
        ...(dto.comments !== undefined        && { comments: dto.comments?.trim() ?? null }),
        updatedAt: now,
        updatedBy,
      };
      const updatedLine = await patchPhoneLine(phoneLineId, lineData, tx);

      if (!needsAssignmentRotation || activeAssignment === null) {
        if (activeAssignment !== null && (dto.remarks !== undefined || dto.phoneType !== undefined)) {
          remarksOnlyAssign = await patchPhoneAssignment(
            activeAssignment.phoneAssignmentId,
            {
              ...(dto.remarks    !== undefined && { remarks:   dto.remarks?.trim()    ?? null }),
              ...(dto.phoneType  !== undefined && { phoneType: dto.phoneType?.trim()  ?? null }),
              updatedAt: now,
              updatedBy,
            },
            tx,
          );
        }
        return { updatedLine };
      }

      await patchPhoneAssignment(
        activeAssignment.phoneAssignmentId,
        { assignDateEnd: today, updatedAt: now, updatedBy },
        tx,
      );

      newAssign = await insertPhoneAssignment(
        {
          phoneLineId,
          teamMemberId:    dto.teamMemberId    ?? activeAssignment.teamMemberId,
          assignDateStart: today,
          assignDateEnd:   null,
          billable:        dto.billable        ?? activeAssignment.billable,
          isFree:          dto.isFree          ?? activeAssignment.isFree,
          billRate:        dto.billRate        ?? Number(activeAssignment.billRate),
          remarks:         dto.remarks !== undefined
            ? (dto.remarks?.trim() ?? null)
            : activeAssignment.remarks,
          phoneType:       dto.phoneType !== undefined
            ? (dto.phoneType?.trim() ?? null)
            : activeAssignment.phoneType,
          createdBy:  updatedBy,
          createdAt:  now,
        },
        tx,
      );

      return { updatedLine };
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
      // Re-fetch the closed assignment for an accurate post-update snapshot (Rule 3.12 spirit)
      const closedSnapshot = await prisma.corporatePhoneAssignment.findUniqueOrThrow({
        where: { phoneAssignmentId: activeAssignment.phoneAssignmentId },
      });
      await auditOrchestrator.log({
        entityName: 'cpa_corporate_phone_assignments',
        entityId:   String(activeAssignment.phoneAssignmentId),
        createdBy:  updatedByEmail,
        oldValues:  activeAssignment as unknown as Record<string, unknown>,
        newValues:  closedSnapshot as unknown as Record<string, unknown>,
        comment:    `Phone assignment closed; team member reassigned`,
      });
    }

    if (newAssign !== null) {
      await auditOrchestrator.log({
        entityName: 'cpa_corporate_phone_assignments',
        entityId:   String((newAssign as CorporatePhoneAssignment).phoneAssignmentId),
        createdBy:  updatedByEmail,
        oldValues:  null,
        newValues:  newAssign as unknown as Record<string, unknown>,
        comment:    `New phone assignment created for team member ID ${(newAssign as CorporatePhoneAssignment).teamMemberId}`,
      });
    }

    const row = await findPhoneLineWithAssignmentOrThrow(phoneLineId);
    return mapToDTO(row, utcToday());
  }

  async renew(
    dto:            RenewPhoneContractsDTO,
    updatedBy:      number,
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

    const existing = await findManyPhoneLines(dto.phoneLineIds);
    if (existing.length !== dto.phoneLineIds.length) {
      const foundIds = new Set(existing.map((c) => c.phoneLineId));
      const missing  = dto.phoneLineIds.filter((id) => !foundIds.has(id));
      throw new AppError(`Phone contract(s) not found or inactive: ${missing.join(', ')}`, 404);
    }

    const existingAssignments = await findManyActiveAssignments(dto.phoneLineIds);
    const assignmentByLineId  = new Map(existingAssignments.map((a) => [a.phoneLineId, a]));

    const { createdLines, createdAssignments } = await prisma.$transaction(async (tx) => {
      const createdLines:       CorporatePhoneLine[]       = [];
      const createdAssignments: CorporatePhoneAssignment[] = [];

      for (const contract of existing) {
        const newContractEnd =
          contract.contractMonths != null && contract.contractMonths >= 1
            ? computeContractEnd(dto.newStartDate, contract.contractMonths)
            : null;

        await patchPhoneLine(
          contract.phoneLineId,
          { contractEndDate: oldEnd, updatedAt: now, updatedBy },
          tx,
        );

        const newLine = await insertPhoneLine(
          {
            phoneNumber:       contract.phoneNumber,
            contractStartDate: newStart,
            contractEndDate:   newContractEnd,
            contractMonths:    contract.contractMonths,
            actualCostRate:    contract.actualCostRate !== null ? Number(contract.actualCostRate) : null,
            countryId:         contract.countryId,
            comments:          contract.comments,
            createdBy:         updatedBy,
            createdAt:         now,
            renewalParentId:   contract.phoneLineId,
          },
          tx,
        );

        createdLines.push(newLine);

        const oldAssignment = assignmentByLineId.get(contract.phoneLineId);
        if (oldAssignment) {
          const newAssignment = await insertPhoneAssignment(
            {
              phoneLineId:     newLine.phoneLineId,
              teamMemberId:    oldAssignment.teamMemberId,
              billRate:        Number(oldAssignment.billRate),
              billable:        oldAssignment.billable,
              isFree:          oldAssignment.isFree,
              remarks:         oldAssignment.remarks,
              phoneType:       oldAssignment.phoneType,
              assignDateStart: newStart,
              assignDateEnd:   null,
              createdBy:       updatedBy,
              createdAt:       now,
            },
            tx,
          );
          createdAssignments.push(newAssignment);
        }
      }

      return { createdLines, createdAssignments };
    });

    for (let i = 0; i < existing.length; i++) {
      // safe: createdLines has exactly one entry per contract by transaction construction
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

    const rows = await findPhoneLinesWithAssignmentsByIds(
      createdLines.map((l) => l.phoneLineId),
    );
    const today = utcToday();
    return rows.map((row) => mapToDTO(row, today));
  }

  async delete(
    phoneLineId:   number,
    updatedBy:     number,
    actionByEmail: string,
  ): Promise<void> {
    const phoneLine = await findPhoneLineById(phoneLineId);
    if (!phoneLine) throw new AppError('Phone contract not found', 404);

    const activeAssignment = await findActiveAssignment(phoneLineId);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await softDeletePhoneLine(
        phoneLineId,
        { updatedBy, updatedAt: now, deletedAt: now },
        tx,
      );

      if (activeAssignment) {
        await softDeletePhoneAssignment(
          activeAssignment.phoneAssignmentId,
          { assignDateEnd: now, updatedBy, updatedAt: now, deletedAt: now },
          tx,
        );
      }
    });

    await auditOrchestrator.log({
      entityName: 'cpl_corporate_phone_lines',
      entityId:   String(phoneLineId),
      createdBy:  actionByEmail,
      oldValues:  phoneLine as unknown as Record<string, unknown>,
      newValues:  null,
      comment:    'Phone contract soft-deleted; active assignment closed',
    });
  }
}

export const phoneContractOrchestrator = new PhoneContractOrchestrator();
