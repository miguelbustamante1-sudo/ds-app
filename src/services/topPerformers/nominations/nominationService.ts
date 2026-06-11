import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { emailOrchestrator } from '../../email';
import { AppError } from '../../../errors/AppError';
import { getNominationById } from './nominationQueries';
import type { TpNominationDTO } from './nominationQueries';
import {
  assertNotSelfNomination,
  assertNoDuplicateNomination,
  assertNominationsOpen,
  assertAdminCanNominate,
} from './nominationGuards';

export interface PeerNominationInput {
  cycId: number;
  nomineeId: number;
  nominatorId: number;
  achievementText: string;
  quantitativeData?: string;
  valuesSelected?: string[];
  valuesDescription?: string;
  nominatorRelationship: 'SAME_TEAM' | 'OTHER_TEAM' | 'PROJECT';
  createdBy: number;
  userEmail: string;
  isDraft?: boolean;
}

export interface AdminNominationInput extends PeerNominationInput {
  adminExceedsRole: string;
  adminClientImpact: string;
  adminConfidenceLevel: number;
  metrics: Array<{ metricName: string; metricValue: string; metricBenchmark?: string }>;
}

export interface CustomerNominationInput {
  cycId: number;
  nomineeId: number;
  nominatorId: number;
  achievementText: string;
  customerChannel: string;
  feedbackDate: Date;
  createdBy: number;
  userEmail: string;
  isDraft?: boolean;
}

async function runBaseValidations(
  cycId: number,
  nominatorId: number,
  nomineeId: number,
  isDraft: boolean
): Promise<void> {
  assertNotSelfNomination(nominatorId, nomineeId);
  if (!isDraft) {
    await assertNominationsOpen(cycId);
    await assertNoDuplicateNomination(cycId, nominatorId, nomineeId);
  }
}

async function sendConfirmationEmail(email: string): Promise<void> {
  await emailOrchestrator
    .send({
      to: email,
      subject: 'Top Performers — Nominación enviada',
      body: 'Tu nominación fue registrada correctamente para el ciclo activo.',
    })
    .catch(() => {});
}

export async function createPeerNomination(input: PeerNominationInput): Promise<TpNominationDTO> {
  const isDraft = input.isDraft ?? false;
  await runBaseValidations(input.cycId, input.nominatorId, input.nomineeId, isDraft);

  if (!isDraft && input.achievementText.length < 80) {
    throw new AppError('Achievement text must be at least 80 characters', 400);
  }

  const nomination = await prisma.tpNomination.create({
    data: {
      cycId: input.cycId,
      nomNomineeId: input.nomineeId,
      nomNominatorId: input.nominatorId,
      nomType: 'PEER',
      nomAchievementText: input.achievementText,
      nomQuantitativeData: input.quantitativeData ?? null,
      nomValuesSelected: input.valuesSelected ?? [],
      nomValuesDescription: input.valuesDescription ?? null,
      nomNominatorRelationship: input.nominatorRelationship,
      nomStatus: isDraft ? 'DRAFT' : 'SUBMITTED',
      nomCreatedBy: input.createdBy,
    },
  });

  await auditOrchestrator.log({
    entityName: 'nom_nominations',
    entityId: String(nomination.nomId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: nomination as unknown as Record<string, unknown>,
    comment: `Top Performers peer nomination ${isDraft ? 'draft' : 'submitted'}`,
  });

  if (!isDraft) {
    await sendConfirmationEmail(input.userEmail);
  }

  return getNominationById(nomination.nomId);
}

export async function createAdminNomination(input: AdminNominationInput): Promise<TpNominationDTO> {
  const isDraft = input.isDraft ?? false;
  await runBaseValidations(input.cycId, input.nominatorId, input.nomineeId, isDraft);
  await assertAdminCanNominate(input.nominatorId, input.nomineeId);

  if (!isDraft) {
    if (input.achievementText.length < 150)
      throw new AppError('Achievement text must be at least 150 characters', 400);
    if (input.adminExceedsRole.length < 100)
      throw new AppError('"Exceeds role" field must be at least 100 characters', 400);
    if (input.adminClientImpact.length < 80)
      throw new AppError('Client impact must be at least 80 characters', 400);
    if (!input.metrics || input.metrics.length === 0)
      throw new AppError('At least one metric is required', 400);
    if (input.adminConfidenceLevel < 1 || input.adminConfidenceLevel > 5)
      throw new AppError('Confidence level must be between 1 and 5', 400);
  }

  const nomination = await prisma.tpNomination.create({
    data: {
      cycId: input.cycId,
      nomNomineeId: input.nomineeId,
      nomNominatorId: input.nominatorId,
      nomType: 'ADMIN',
      nomAchievementText: input.achievementText,
      nomQuantitativeData: input.quantitativeData ?? null,
      nomValuesSelected: input.valuesSelected ?? [],
      nomValuesDescription: input.valuesDescription ?? null,
      nomNominatorRelationship: input.nominatorRelationship ?? null,
      nomAdminExceedsRole: input.adminExceedsRole,
      nomAdminClientImpact: input.adminClientImpact,
      nomAdminConfidenceLevel: input.adminConfidenceLevel,
      nomStatus: isDraft ? 'DRAFT' : 'SUBMITTED',
      nomCreatedBy: input.createdBy,
      metrics: {
        create: input.metrics.map((m, i) => ({
          nmeMetricName: m.metricName,
          nmeMetricValue: m.metricValue,
          nmeMetricBenchmark: m.metricBenchmark ?? null,
          nmeSortOrder: i,
        })),
      },
    },
  });

  await auditOrchestrator.log({
    entityName: 'nom_nominations',
    entityId: String(nomination.nomId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: nomination as unknown as Record<string, unknown>,
    comment: `Top Performers admin nomination ${isDraft ? 'draft' : 'submitted'}`,
  });

  if (!isDraft) {
    await sendConfirmationEmail(input.userEmail);
  }

  return getNominationById(nomination.nomId);
}

export async function createCustomerNomination(input: CustomerNominationInput): Promise<TpNominationDTO> {
  const isDraft = input.isDraft ?? false;
  await runBaseValidations(input.cycId, input.nominatorId, input.nomineeId, isDraft);

  if (!isDraft && input.achievementText.length < 50)
    throw new AppError('Customer feedback must be at least 50 characters', 400);

  const nomination = await prisma.tpNomination.create({
    data: {
      cycId: input.cycId,
      nomNomineeId: input.nomineeId,
      nomNominatorId: input.nominatorId,
      nomType: 'CUSTOMER',
      nomAchievementText: input.achievementText,
      nomQuantitativeData: input.customerChannel,
      nomIsVozDelCliente: true,
      nomStatus: isDraft ? 'DRAFT' : 'SUBMITTED',
      nomCreatedBy: input.createdBy,
    },
  });

  await auditOrchestrator.log({
    entityName: 'nom_nominations',
    entityId: String(nomination.nomId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: nomination as unknown as Record<string, unknown>,
    comment: `Top Performers customer nomination ${isDraft ? 'draft' : 'submitted'}`,
  });

  if (!isDraft) {
    await sendConfirmationEmail(input.userEmail);
  }

  return getNominationById(nomination.nomId);
}
