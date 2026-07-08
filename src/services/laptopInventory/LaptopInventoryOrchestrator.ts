// src/services/laptopInventory/LaptopInventoryOrchestrator.ts
import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import {
  findAllLaptops,
  findLaptopById,
  findActiveAssignment,
  insertLaptop,
  insertLaptopAssignment,
  patchLaptop,
  patchLaptopAssignment,
  softDeleteLaptop,
  mapToDTO,
} from './repository';
import type {
  LaptopDTO,
  CreateLaptopDTO,
  UpdateLaptopDTO,
} from '../../../shared/dto/LaptopInventory';
import type { Laptop, LaptopAssignment } from '@prisma/client';

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value + 'T00:00:00.000Z');
}

export class LaptopInventoryOrchestrator {

  async list(): Promise<LaptopDTO[]> {
    const rows = await findAllLaptops();
    return rows.map(mapToDTO);
  }

  async create(
    dto:            CreateLaptopDTO,
    createdBy:      number,
    createdByEmail: string,
  ): Promise<LaptopDTO> {
    const now = new Date();

    const { laptop, assignment } = await prisma.$transaction(async (tx) => {
      const laptop = await insertLaptop(
        {
          serialNumber: dto.serialNumber.trim(),
          assetNumber:  dto.assetNumber?.trim() ?? null,
          model:        dto.model?.trim() ?? null,
          brand:        dto.brand?.trim() ?? null,
          code:         dto.code?.trim() ?? null,
          ramGb:        dto.ramGb?.trim() ?? null,
          storageGb:    dto.storageGb?.trim() ?? null,
          region:       dto.region?.trim() ?? null,
          purchaseDate: parseDate(dto.purchaseDate),
          po:           dto.po?.trim() ?? null,
          usable:       dto.usable ?? true,
          category:     dto.category?.trim() ?? null,
          site:         dto.site?.trim() ?? null,
          status:       dto.status?.trim() ?? 'Available',
          comments:     dto.comments?.trim() ?? null,
          createdBy,
          createdDate: now,
        },
        tx,
      );

      let assignment: LaptopAssignment | null = null;
      if (dto.teamMemberId != null) {
        assignment = await insertLaptopAssignment(
          {
            laptopId:     laptop.laptopId,
            teamMemberId: dto.teamMemberId,
            startDate:    parseDate(dto.purchaseDate) ?? now,
            endDate:      null,
            notes:        dto.assignmentNotes?.trim() ?? null,
            createdBy,
            createdDate:  now,
          },
          tx,
        );
      }

      return { laptop, assignment };
    });

    await auditOrchestrator.log({
      entityName: 'lap_laptops',
      entityId:   String(laptop.laptopId),
      createdBy:  createdByEmail,
      oldValues:  null,
      newValues:  laptop as unknown as Record<string, unknown>,
      comment:    `Laptop ${laptop.serialNumber} created`,
    });

    if (assignment !== null) {
      await auditOrchestrator.log({
        entityName: 'lpa_laptop_assignments',
        entityId:   String(assignment.assignmentId),
        createdBy:  createdByEmail,
        oldValues:  null,
        newValues:  assignment as unknown as Record<string, unknown>,
        comment:    `Laptop ${laptop.serialNumber} assigned to team member ID ${assignment.teamMemberId}`,
      });
    }

    const row = await findLaptopById(laptop.laptopId);
    if (!row) throw new AppError('Laptop not found after create', 500);
    return mapToDTO(row);
  }

  async update(
    laptopId:       number,
    dto:            UpdateLaptopDTO,
    updatedBy:      number,
    updatedByEmail: string,
  ): Promise<LaptopDTO> {
    const existing = await findLaptopById(laptopId);
    if (!existing) throw new AppError('Laptop not found', 404);

    const activeAssignment = await findActiveAssignment(laptopId);
    const now = new Date();

    const teamMemberChanged =
      dto.teamMemberId !== undefined &&
      dto.teamMemberId !== (activeAssignment?.teamMemberId ?? null);

    let newAssignment: LaptopAssignment | null = null;

    const { updatedLaptop } = await prisma.$transaction(async (tx) => {
      const updatedLaptop = await patchLaptop(
        laptopId,
        {
          ...(dto.assetNumber  !== undefined && { assetNumber:  dto.assetNumber?.trim()  ?? null }),
          ...(dto.model        !== undefined && { model:        dto.model?.trim()        ?? null }),
          ...(dto.brand        !== undefined && { brand:        dto.brand?.trim()        ?? null }),
          ...(dto.code         !== undefined && { code:         dto.code?.trim()         ?? null }),
          ...(dto.ramGb        !== undefined && { ramGb:        dto.ramGb?.trim()        ?? null }),
          ...(dto.storageGb    !== undefined && { storageGb:    dto.storageGb?.trim()    ?? null }),
          ...(dto.region       !== undefined && { region:       dto.region?.trim()       ?? null }),
          ...(dto.purchaseDate !== undefined && { purchaseDate: parseDate(dto.purchaseDate) }),
          ...(dto.po           !== undefined && { po:           dto.po?.trim()           ?? null }),
          ...(dto.usable       !== undefined && { usable:       dto.usable }),
          ...(dto.category     !== undefined && { category:     dto.category?.trim()     ?? null }),
          ...(dto.site         !== undefined && { site:         dto.site?.trim()         ?? null }),
          ...(dto.status       !== undefined && { status:       dto.status?.trim() }),
          ...(dto.comments     !== undefined && { comments:     dto.comments?.trim()     ?? null }),
          updatedBy,
          updatedDate: now,
        },
        tx,
      );

      if (teamMemberChanged) {
        if (activeAssignment !== null) {
          await patchLaptopAssignment(
            activeAssignment.assignmentId,
            { endDate: now, updatedBy, updatedDate: now },
            tx,
          );
        }

        if (dto.teamMemberId != null) {
          newAssignment = await insertLaptopAssignment(
            {
              laptopId,
              teamMemberId: dto.teamMemberId,
              startDate:    now,
              endDate:      null,
              notes:        dto.assignmentNotes?.trim() ?? null,
              createdBy:    updatedBy,
              createdDate:  now,
            },
            tx,
          );
        }
      } else if (
        dto.assignmentNotes !== undefined &&
        activeAssignment !== null
      ) {
        await patchLaptopAssignment(
          activeAssignment.assignmentId,
          { notes: dto.assignmentNotes?.trim() ?? null, updatedBy, updatedDate: now },
          tx,
        );
      }

      return { updatedLaptop };
    });

    await auditOrchestrator.log({
      entityName: 'lap_laptops',
      entityId:   String(laptopId),
      createdBy:  updatedByEmail,
      oldValues:  existing as unknown as Record<string, unknown>,
      newValues:  updatedLaptop as unknown as Record<string, unknown>,
      comment:    `Laptop ${existing.serialNumber} updated`,
    });

    if (teamMemberChanged && activeAssignment !== null) {
      const closedSnap = await prisma.laptopAssignment.findUniqueOrThrow({
        where: { assignmentId: activeAssignment.assignmentId },
      });
      await auditOrchestrator.log({
        entityName: 'lpa_laptop_assignments',
        entityId:   String(activeAssignment.assignmentId),
        createdBy:  updatedByEmail,
        oldValues:  activeAssignment as unknown as Record<string, unknown>,
        newValues:  closedSnap as unknown as Record<string, unknown>,
        comment:    `Assignment closed; laptop reassigned`,
      });
    }

    if (newAssignment !== null) {
      await auditOrchestrator.log({
        entityName: 'lpa_laptop_assignments',
        entityId:   String((newAssignment as LaptopAssignment).assignmentId),
        createdBy:  updatedByEmail,
        oldValues:  null,
        newValues:  newAssignment as unknown as Record<string, unknown>,
        comment:    `New assignment created for team member ID ${(newAssignment as LaptopAssignment).teamMemberId}`,
      });
    }

    if (!teamMemberChanged && dto.assignmentNotes !== undefined && activeAssignment !== null) {
      const updatedAssignmentSnap = await prisma.laptopAssignment.findUniqueOrThrow({
        where: { assignmentId: activeAssignment.assignmentId },
      });
      await auditOrchestrator.log({
        entityName: 'lpa_laptop_assignments',
        entityId:   String(activeAssignment.assignmentId),
        createdBy:  updatedByEmail,
        oldValues:  activeAssignment as unknown as Record<string, unknown>,
        newValues:  updatedAssignmentSnap as unknown as Record<string, unknown>,
        comment:    `Assignment notes updated for laptop ${existing.serialNumber}`,
      });
    }

    const row = await findLaptopById(laptopId);
    if (!row) throw new AppError('Laptop not found after update', 500);
    return mapToDTO(row);
  }

  async delete(
    laptopId:      number,
    updatedBy:     number,
    actionByEmail: string,
  ): Promise<void> {
    const existing = await findLaptopById(laptopId);
    if (!existing) throw new AppError('Laptop not found', 404);

    const activeAssignment = await findActiveAssignment(laptopId);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await softDeleteLaptop(laptopId, { updatedBy, updatedDate: now }, tx);

      if (activeAssignment) {
        await patchLaptopAssignment(
          activeAssignment.assignmentId,
          { endDate: now, updatedBy, updatedDate: now },
          tx,
        );
      }
    });

    await auditOrchestrator.log({
      entityName: 'lap_laptops',
      entityId:   String(laptopId),
      createdBy:  actionByEmail,
      oldValues:  existing as unknown as Record<string, unknown>,
      newValues:  null,
      comment:    activeAssignment !== null
        ? `Laptop ${existing.serialNumber} deleted; active assignment closed`
        : `Laptop ${existing.serialNumber} deleted`,
    });

    if (activeAssignment !== null) {
      const closedSnap = await prisma.laptopAssignment.findUniqueOrThrow({
        where: { assignmentId: activeAssignment.assignmentId },
      });
      await auditOrchestrator.log({
        entityName: 'lpa_laptop_assignments',
        entityId:   String(activeAssignment.assignmentId),
        createdBy:  actionByEmail,
        oldValues:  activeAssignment as unknown as Record<string, unknown>,
        newValues:  closedSnap as unknown as Record<string, unknown>,
        comment:    `Assignment closed due to laptop ${existing.serialNumber} deletion`,
      });
    }
  }
}

export const laptopInventoryOrchestrator = new LaptopInventoryOrchestrator();
