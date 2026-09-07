import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';
import { TP_CYCLE_STATUSES } from '@shared/dto/TopPerformersCycle';
import type { TpCycleDTO, TpCycleStatus } from '@shared/dto/TopPerformersCycle';
import { getCycleById, cycleSelect, toDTO } from './cycleQueries';

export interface CreateCycleInput {
  cycName: string;
  cycNominationsStart: Date;
  cycNominationsEnd: Date;
  cycVotingStart: Date;
  cycVotingEnd: Date;
  createdBy: number;
  userEmail: string;
}

export interface UpdateCycleStatusInput {
  cycId: number;
  cycStatus: TpCycleStatus;
  updatedBy: number;
  userEmail: string;
}

export async function createCycle(input: CreateCycleInput): Promise<TpCycleDTO> {
  if (input.cycNominationsEnd <= input.cycNominationsStart)
    throw new AppError('Nominations end must be after start', 400);
  if (input.cycVotingStart <= input.cycNominationsEnd)
    throw new AppError('Voting must start after nominations close', 400);
  if (input.cycVotingEnd <= input.cycVotingStart)
    throw new AppError('Voting end must be after start', 400);

  const raw = await prisma.tpCycle.create({
    data: {
      cycName: input.cycName,
      cycNominationsStart: input.cycNominationsStart,
      cycNominationsEnd: input.cycNominationsEnd,
      cycVotingStart: input.cycVotingStart,
      cycVotingEnd: input.cycVotingEnd,
      cycCreatedBy: input.createdBy,
    },
    select: cycleSelect,
  });

  const created = toDTO(raw);

  await auditOrchestrator.log({
    entityName: 'cyc_cycles',
    entityId: String(created.cycId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
    comment: `Top Performers cycle created: ${input.cycName}`,
  });

  return created;
}

export interface UpdateCycleInput {
  cycId: number;
  cycName: string;
  cycNominationsStart: Date;
  cycNominationsEnd: Date;
  cycVotingStart: Date;
  cycVotingEnd: Date;
  updatedBy: number;
  userEmail: string;
}

export async function updateCycle(input: UpdateCycleInput): Promise<TpCycleDTO> {
  if (input.cycNominationsEnd <= input.cycNominationsStart)
    throw new AppError('Nominations end must be after start', 400);
  if (input.cycVotingStart <= input.cycNominationsEnd)
    throw new AppError('Voting must start after nominations close', 400);
  if (input.cycVotingEnd <= input.cycVotingStart)
    throw new AppError('Voting end must be after start', 400);

  const before = await getCycleById(input.cycId);

  const raw = await prisma.tpCycle.update({
    where: { cycId: input.cycId },
    data: {
      cycName: input.cycName,
      cycNominationsStart: input.cycNominationsStart,
      cycNominationsEnd: input.cycNominationsEnd,
      cycVotingStart: input.cycVotingStart,
      cycVotingEnd: input.cycVotingEnd,
      cycUpdatedBy: input.updatedBy,
      cycUpdatedDate: new Date(),
    },
    select: cycleSelect,
  });

  const updated = toDTO(raw);

  await auditOrchestrator.log({
    entityName: 'cyc_cycles',
    entityId: String(input.cycId),
    createdBy: input.userEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
    comment: `Top Performers cycle updated: ${input.cycName}`,
  });

  return updated;
}

export async function updateCycleStatus(input: UpdateCycleStatusInput): Promise<TpCycleDTO> {
  if (!(TP_CYCLE_STATUSES as readonly string[]).includes(input.cycStatus))
    throw new AppError(`Invalid status: ${input.cycStatus}`, 400);

  const before = await getCycleById(input.cycId);

  const raw = await prisma.tpCycle.update({
    where: { cycId: input.cycId },
    data: {
      cycStatus: input.cycStatus,
      cycUpdatedBy: input.updatedBy,
      cycUpdatedDate: new Date(),
    },
    select: cycleSelect,
  });

  const updated = toDTO(raw);

  await auditOrchestrator.log({
    entityName: 'cyc_cycles',
    entityId: String(input.cycId),
    createdBy: input.userEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
    comment: `Top Performers cycle status changed to ${input.cycStatus}`,
  });

  return updated;
}
