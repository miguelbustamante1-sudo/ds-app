import {
  WATCHED_FIELD_COMPARISON_MODES,
  WATCHED_FIELD_DATA_TYPES,
  WATCHED_FIELD_SIGNIFICANCES,
} from '@shared/dto';
import type {
  CreateWatchedEntityDto,
  CreateWatchedFieldDto,
  UpdateWatchedFieldDto,
  WatchedEntityDto,
  WatchedFieldDto,
} from '@shared/dto';
import { AppError } from '../../errors/AppError';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import {
  createEntity,
  createField,
  findFieldByPath,
  getEntity,
  getField,
  listEntities,
  listFields,
  setEntityActive,
  updateField,
} from './repository';

const ENTITY_TABLE = 'cde_watched_entities';
const FIELD_TABLE = 'cdf_watched_fields';
const ENTITY_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;

function snapshot(dto: WatchedEntityDto | WatchedFieldDto): Record<string, unknown> {
  return { ...dto } as Record<string, unknown>;
}

function assertOneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new AppError(`Invalid ${label} "${value}". Allowed: ${allowed.join(', ')}`, 400);
  }
  return value as T;
}

function validateFieldPayload(payload: CreateWatchedFieldDto | UpdateWatchedFieldDto) {
  const displayName = payload.displayName?.trim();
  if (!displayName) throw new AppError('Display name is required', 400);

  assertOneOf(payload.dataType, WATCHED_FIELD_DATA_TYPES, 'data type');
  const comparisonMode = assertOneOf(payload.comparisonMode, WATCHED_FIELD_COMPARISON_MODES, 'comparison mode');
  assertOneOf(payload.significance, WATCHED_FIELD_SIGNIFICANCES, 'significance');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.effectiveFrom)) {
    throw new AppError('Effective from must be a YYYY-MM-DD date', 400);
  }

  // Tolerance is only meaningful for numeric_tolerance; drop it otherwise so the
  // column never holds a value the comparison mode would ignore.
  const tolerance = comparisonMode === 'numeric_tolerance' ? (payload.tolerance ?? null) : null;
  if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance < 0)) {
    throw new AppError('Tolerance must be a non-negative number', 400);
  }

  return { displayName, tolerance };
}

export class WatchedFieldsOrchestrator {
  async getEntities(): Promise<WatchedEntityDto[]> {
    return listEntities();
  }

  async getFields(entityType: string): Promise<WatchedFieldDto[]> {
    const entity = await getEntity(entityType);
    if (!entity) throw new AppError(`Watched entity "${entityType}" not found`, 404);
    return listFields(entityType);
  }

  async createEntity(payload: CreateWatchedEntityDto, actor: string): Promise<WatchedEntityDto> {
    const entityType = payload.entityType?.trim().toLowerCase();
    const label = payload.label?.trim();

    if (!entityType) throw new AppError('Entity type is required', 400);
    if (!ENTITY_TYPE_PATTERN.test(entityType)) {
      throw new AppError('Entity type must be lowercase letters, digits and underscores, starting with a letter', 400);
    }
    if (!label) throw new AppError('Label is required', 400);

    if (await getEntity(entityType)) {
      throw new AppError(`Watched entity "${entityType}" already exists`, 409);
    }

    const created = await createEntity(
      { entityType, label, ownerEmail: payload.ownerEmail?.trim() || null },
      actor,
    );

    await auditOrchestrator.log({
      entityName: ENTITY_TABLE,
      entityId: created.entityType,
      createdBy: actor,
      oldValues: null,
      newValues: snapshot(created),
      comment: `Watched entity ${created.entityType} created`,
    });

    return created;
  }

  async setEntityActive(entityType: string, active: boolean, actor: string): Promise<WatchedEntityDto> {
    const existing = await getEntity(entityType);
    if (!existing) throw new AppError(`Watched entity "${entityType}" not found`, 404);

    const updated = await setEntityActive(entityType, active, actor);

    await auditOrchestrator.log({
      entityName: ENTITY_TABLE,
      entityId: entityType,
      createdBy: actor,
      oldValues: snapshot(existing),
      newValues: snapshot(updated),
      comment: `Watched entity ${entityType} ${active ? 'activated' : 'deactivated'}`,
    });

    return updated;
  }

  async createField(payload: CreateWatchedFieldDto, actor: string): Promise<WatchedFieldDto> {
    const entity = await getEntity(payload.entityType);
    if (!entity) throw new AppError(`Watched entity "${payload.entityType}" not found`, 404);

    const fieldPath = payload.fieldPath?.trim();
    if (!fieldPath) throw new AppError('Field path is required', 400);

    const { displayName, tolerance } = validateFieldPayload(payload);

    if (await findFieldByPath(payload.entityType, fieldPath)) {
      throw new AppError(`Field "${fieldPath}" already exists on ${payload.entityType}`, 409);
    }

    const created = await createField({ ...payload, fieldPath, displayName, tolerance }, actor);

    await auditOrchestrator.log({
      entityName: FIELD_TABLE,
      entityId: String(created.fieldId),
      createdBy: actor,
      oldValues: null,
      newValues: snapshot(created),
      comment: `Watched field ${created.entityType}.${created.fieldPath} created`,
    });

    return created;
  }

  async updateField(fieldId: number, payload: UpdateWatchedFieldDto, actor: string): Promise<WatchedFieldDto> {
    const existing = await getField(fieldId);
    if (!existing) throw new AppError(`Watched field ${fieldId} not found`, 404);

    const { displayName, tolerance } = validateFieldPayload(payload);

    const updated = await updateField(fieldId, { ...payload, displayName, tolerance }, actor);

    await auditOrchestrator.log({
      entityName: FIELD_TABLE,
      entityId: String(fieldId),
      createdBy: actor,
      oldValues: snapshot(existing),
      newValues: snapshot(updated),
      comment: `Watched field ${updated.entityType}.${updated.fieldPath} updated`,
    });

    return updated;
  }
}

export const watchedFieldsOrchestrator = new WatchedFieldsOrchestrator();
