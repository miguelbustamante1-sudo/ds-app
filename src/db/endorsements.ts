import { prisma } from './prisma';
import type { Endorsement, Prisma } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.end_endorsements';

export async function getEndorsements(status?: string): Promise<Endorsement[]> {
  info(`Fetching endorsements from table ${TABLE} with status filter: ${status ?? 'Pending'}`);
  return await prisma.endorsement.findMany({
    where: { status: status ?? 'Pending' },
    include: {
      project: { select: { projectName: true } },
      country: { select: { countryName: true, countryCurrencySymbol: true } },
      tierBand: { select: { tierBandId: true, tierBandDescription: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEndorsement(data: {
  candidateFirstName: string;
  candidateLastName: string;
  candidatePosition: string;
  projectId: number;
  clientManagerEmail: string;
  tibId?: number | null;
  billingRate?: number | null;
  countryId: number;
  startDate: Date;
  status: string;
  createdBy: string;
  comment?: string | null;
}): Promise<Endorsement> {
  info(`Creating endorsement in table ${TABLE}`);
  return await prisma.endorsement.create({
    data: {
      candidateFirstName: data.candidateFirstName,
      candidateLastName: data.candidateLastName,
      candidatePosition: data.candidatePosition,
      projectId: data.projectId,
      clientManagerEmail: data.clientManagerEmail,
      tibId: data.tibId ?? null,
      billingRate: data.billingRate ?? null,
      countryId: data.countryId,
      startDate: data.startDate,
      status: data.status,
      createdBy: data.createdBy,
      comment: data.comment ?? null,
    },
    include: {
      project: { select: { projectName: true } },
      country: { select: { countryName: true, countryCurrencySymbol: true } },
      tierBand: { select: { tierBandId: true, tierBandDescription: true } },
    },
  });
}

export async function createEndorsementWithBonuses(
  endorsementData: {
    candidateFirstName: string;
    candidateLastName: string;
    candidatePosition: string;
    projectId: number;
    clientManagerEmail: string;
    tibId?: number | null;
    billingRate?: number | null;
    countryId: number;
    startDate: Date;
    status: string;
    createdBy: string;
    comment?: string | null;
  },
  bonuses: Array<{
    bonusSubcategoryId: number;
    endorsementBonusAmount: number | null;
    endorsementBonusComments: string | null;
    endorsementBonusMetadata: Record<string, unknown>;
    endorsementBonusCreatedBy: string;
  }>,
) {
  info(`Creating endorsement with ${bonuses.length} bonuses in table ${TABLE}`);
  return await prisma.$transaction(async (tx) => {
    const endorsement = await tx.endorsement.create({
      data: {
        candidateFirstName: endorsementData.candidateFirstName,
        candidateLastName: endorsementData.candidateLastName,
        candidatePosition: endorsementData.candidatePosition,
        projectId: endorsementData.projectId,
        clientManagerEmail: endorsementData.clientManagerEmail,
        tibId: endorsementData.tibId ?? null,
        billingRate: endorsementData.billingRate ?? null,
        countryId: endorsementData.countryId,
        startDate: endorsementData.startDate,
        status: endorsementData.status,
        createdBy: endorsementData.createdBy,
        comment: endorsementData.comment ?? null,
      },
    });

    if (bonuses.length > 0) {
      await tx.endorsementBonus.createMany({
        data: bonuses.map((b) => ({
          endorsementId: endorsement.endorsementId,
          bonusSubcategoryId: b.bonusSubcategoryId,
          endorsementBonusAmount: b.endorsementBonusAmount,
          endorsementBonusComments: b.endorsementBonusComments,
          endorsementBonusMetadata: b.endorsementBonusMetadata as Prisma.InputJsonValue,
          endorsementBonusCreatedBy: b.endorsementBonusCreatedBy,
        })),
      });
    }

    return await tx.endorsement.findUnique({
      where: { endorsementId: endorsement.endorsementId },
      include: ENDORSEMENT_INCLUDE,
    });
  });
}

const ENDORSEMENT_INCLUDE = {
  project: { select: { projectName: true } },
  country: { select: { countryName: true, countryCurrencySymbol: true } },
  tierBand: { select: { tierBandId: true, tierBandDescription: true } },
  endorsementBonuses: {
    include: {
      bonusSubcategory: {
        include: {
          bonusCategory: true,
        },
      },
    },
  },
};

export async function getEndorsementById(id: number) {
  info(`Fetching endorsement ${id} from table ${TABLE}`);
  return await prisma.endorsement.findUnique({
    where: { endorsementId: id },
    include: ENDORSEMENT_INCLUDE,
  });
}

export async function updateEndorsement(
  id: number,
  data: Record<string, unknown>,
) {
  info(`Updating endorsement ${id} in table ${TABLE}`);
  return await prisma.endorsement.update({
    where: { endorsementId: id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: ENDORSEMENT_INCLUDE,
  });
}

export async function deleteEndorsement(id: number) {
  info(`Deleting endorsement ${id} from table ${TABLE}`);
  await prisma.endorsement.delete({
    where: { endorsementId: id },
  });
}
