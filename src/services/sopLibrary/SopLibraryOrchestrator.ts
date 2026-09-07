import { AppError } from '../../errors/AppError';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { resolveSopTier } from './resolveSopTier';
import * as repo from './SopLibraryRepository';
import type {
  SopLibraryItemDto,
  CreateSopLibraryItemInput,
  UpdateSopLibraryItemInput,
} from './types';

class SopLibraryOrchestrator {
  async listForUser(roles: string[]): Promise<SopLibraryItemDto[]> {
    const tier = resolveSopTier(roles);
    return repo.listByTier(tier);
  }

  async listAll(): Promise<SopLibraryItemDto[]> {
    return repo.listAll();
  }

  async create(
    input: CreateSopLibraryItemInput,
    dsUserId: number,
    userEmail: string,
  ): Promise<SopLibraryItemDto> {
    if (!input.sliName?.trim()) throw new AppError('Name is required', 400);
    if (!input.sliGoogleUrl?.trim()) throw new AppError('Google Drive URL is required', 400);
    if (input.sliMinTier < 1 || input.sliMinTier > 5)
      throw new AppError('Min tier must be between 1 and 5', 400);

    const item = await repo.create(input, dsUserId);

    await auditOrchestrator.log({
      entityName: 'sli_sop_library_items',
      entityId:   String(item.sliId),
      createdBy:  userEmail,
      oldValues:  null,
      newValues:  item as unknown as Record<string, unknown>,
      comment:    'SOP Library item created',
    });

    return item;
  }

  async update(
    id: number,
    input: UpdateSopLibraryItemInput,
    dsUserId: number,
    userEmail: string,
  ): Promise<SopLibraryItemDto> {
    if (input.sliMinTier !== undefined && (input.sliMinTier < 1 || input.sliMinTier > 5))
      throw new AppError('Min tier must be between 1 and 5', 400);

    const before = await repo.getById(id);
    if (!before) throw new AppError('SOP Library item not found', 404);

    const after = await repo.update(id, input, dsUserId);
    if (!after) throw new AppError('SOP Library item not found', 404);

    await auditOrchestrator.log({
      entityName: 'sli_sop_library_items',
      entityId:   String(id),
      createdBy:  userEmail,
      oldValues:  before as unknown as Record<string, unknown>,
      newValues:  after  as unknown as Record<string, unknown>,
      comment:    'SOP Library item updated',
    });

    return after;
  }

  async delete(
    id: number,
    dsUserId: number,
    userEmail: string,
  ): Promise<void> {
    const before = await repo.getById(id);
    if (!before) throw new AppError('SOP Library item not found', 404);

    const after = await repo.softDelete(id, dsUserId);

    await auditOrchestrator.log({
      entityName: 'sli_sop_library_items',
      entityId:   String(id),
      createdBy:  userEmail,
      oldValues:  before as unknown as Record<string, unknown>,
      newValues:  after  as unknown as Record<string, unknown>,
      comment:    'SOP Library item deactivated',
    });
  }
}

export const sopLibraryOrchestrator = new SopLibraryOrchestrator();
