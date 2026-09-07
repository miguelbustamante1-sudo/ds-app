import { Prisma } from '@prisma/client';
import {
  getAllIncomeTypes,
  getActiveIncomeTypes,
  getIncomeTypeById,
  createIncomeType as createInDb,
  updateIncomeType as updateInDb,
  deleteIncomeType as deleteInDb,
  TABLE,
} from './repository';
import { IncomeTypeNotFoundError, DuplicateIncomeTypeNameError, IncomeTypeInUseError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type { CreateIncomeTypeDTO, UpdateIncomeTypeDTO, IncomeTypeDTO } from '@shared/dto/IncomeType';

function isPrismaKnownError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

export class IncomeTypeOrchestrator {
  async getAll(): Promise<IncomeTypeDTO[]> {
    return getAllIncomeTypes();
  }

  /** Active-only, name-sorted — for the create-form ComboBox, consumed by non-admin hierarchy users too. */
  async getActive(): Promise<IncomeTypeDTO[]> {
    return getActiveIncomeTypes();
  }

  async getById(id: number): Promise<IncomeTypeDTO> {
    const record = await getIncomeTypeById(id);
    if (!record) throw new IncomeTypeNotFoundError();
    return record;
  }

  async create(dto: CreateIncomeTypeDTO, userEmail: string, dsUserId: number): Promise<IncomeTypeDTO> {
    try {
      const created = await createInDb({
        incomeTypeName: dto.incomeTypeName,
        incomeTypeIsActive: dto.incomeTypeIsActive ?? true,
        incomeTypeCreatedBy: dsUserId,
        incomeTypeLastUpdatedBy: dsUserId,
        incomeTypeLastUpdatedDate: new Date(),
      });

      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(created.incomeTypeId),
        createdBy: userEmail,
        oldValues: null,
        newValues: created as unknown as Record<string, unknown>,
        comment: `Income type created: ${dto.incomeTypeName}`,
      });

      return created;
    } catch (err: unknown) {
      if (isPrismaKnownError(err, 'P2002')) {
        throw new DuplicateIncomeTypeNameError(dto.incomeTypeName);
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateIncomeTypeDTO, userEmail: string, dsUserId: number): Promise<IncomeTypeDTO> {
    const before = await getIncomeTypeById(id);
    if (!before) throw new IncomeTypeNotFoundError();

    try {
      const updated = await updateInDb(id, {
        ...(dto.incomeTypeName !== undefined && { incomeTypeName: dto.incomeTypeName }),
        ...(dto.incomeTypeIsActive !== undefined && { incomeTypeIsActive: dto.incomeTypeIsActive }),
        incomeTypeLastUpdatedBy: dsUserId,
        incomeTypeLastUpdatedDate: new Date(),
      });

      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(id),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
        comment: 'Income type updated',
      });

      return updated;
    } catch (err: unknown) {
      if (isPrismaKnownError(err, 'P2002')) {
        throw new DuplicateIncomeTypeNameError(dto.incomeTypeName ?? before.incomeTypeName);
      }
      throw err;
    }
  }

  async delete(id: number, userEmail: string): Promise<void> {
    const before = await getIncomeTypeById(id);
    if (!before) throw new IncomeTypeNotFoundError();

    try {
      await deleteInDb(id);
    } catch (err: unknown) {
      if (isPrismaKnownError(err, 'P2003')) {
        throw new IncomeTypeInUseError();
      }
      throw err;
    }

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Income type deleted',
    });
  }
}

export const incomeTypeOrchestrator = new IncomeTypeOrchestrator();
