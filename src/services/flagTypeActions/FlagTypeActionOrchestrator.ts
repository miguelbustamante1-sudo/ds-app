import { Prisma } from '@prisma/client';
import {
  getAllFlagTypeActions,
  getFlagTypeActionById,
  createFlagTypeAction as createInDb,
  updateFlagTypeAction as updateInDb,
  deleteFlagTypeAction as deleteInDb,
  TABLE,
} from './repository';
import { FlagTypeActionNotFoundError, DuplicateFlagTypeActionCategoryError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type { CreateFlagTypeActionDTO, UpdateFlagTypeActionDTO, FlagTypeActionDTO } from '@shared/dto/FlagTypeAction';

function isPrismaKnownError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

export class FlagTypeActionOrchestrator {
  async getAll(): Promise<FlagTypeActionDTO[]> {
    return getAllFlagTypeActions();
  }

  async getById(id: number): Promise<FlagTypeActionDTO> {
    const record = await getFlagTypeActionById(id);
    if (!record) throw new FlagTypeActionNotFoundError();
    return record;
  }

  async create(dto: CreateFlagTypeActionDTO, userEmail: string, dsUserId: number): Promise<FlagTypeActionDTO> {
    try {
      const created = await createInDb({
        category: dto.category,
        actionLabel: dto.actionLabel,
        actionUrl: dto.actionUrl,
        createdBy: dsUserId,
      });

      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(created.flagTypeActionId),
        createdBy: userEmail,
        oldValues: null,
        newValues: created as unknown as Record<string, unknown>,
        comment: `Flag type action created for category "${dto.category}"`,
      });

      return created;
    } catch (err: unknown) {
      if (isPrismaKnownError(err, 'P2002')) {
        throw new DuplicateFlagTypeActionCategoryError(dto.category);
      }
      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateFlagTypeActionDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<FlagTypeActionDTO> {
    const before = await getFlagTypeActionById(id);
    if (!before) throw new FlagTypeActionNotFoundError();

    try {
      const updated = await updateInDb(id, {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.actionLabel !== undefined && { actionLabel: dto.actionLabel }),
        ...(dto.actionUrl !== undefined && { actionUrl: dto.actionUrl }),
        updatedBy: dsUserId,
        updatedDate: new Date(),
      });

      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(id),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
        comment: `Flag type action updated for category "${updated.category}"`,
      });

      return updated;
    } catch (err: unknown) {
      if (isPrismaKnownError(err, 'P2002')) {
        throw new DuplicateFlagTypeActionCategoryError(dto.category ?? before.category);
      }
      throw err;
    }
  }

  async delete(id: number, userEmail: string): Promise<void> {
    const before = await getFlagTypeActionById(id);
    if (!before) throw new FlagTypeActionNotFoundError();

    await deleteInDb(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Flag type action deleted for category "${before.category}"`,
    });
  }
}

export const flagTypeActionOrchestrator = new FlagTypeActionOrchestrator();
