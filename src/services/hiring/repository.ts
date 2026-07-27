import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all Endorsement records with status "Approved" that do NOT yet have
 * a Hiring record linked to them. Feeds the "Ready to Draft" tab.
 */
export async function getApprovedEndorsementsWithoutHiring() {
  return prisma.endorsement.findMany({
    where: {
      status: 'Approved',
      hirings: { none: {} },
    },
    include: {
      project: { select: { projectName: true } },
      country: { select: { countryName: true, countryCurrencySymbol: true } },
      tierBand: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns all Endorsement records with status "Pending" that do NOT yet have
 * a Hiring record linked to them. Feeds the "Pending Approval" tab.
 */
export async function getPendingApprovalEndorsements() {
  return prisma.endorsement.findMany({
    where: {
      status: 'Pending',
      hirings: { none: {} },
    },
    include: {
      project: { select: { projectName: true } },
      country: { select: { countryName: true, countryCurrencySymbol: true } },
      tierBand: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns all Hiring records with status "Pending".
 * Feeds the "Pending Execution" tab.
 */
export async function getPendingHirings() {
  return prisma.hiring.findMany({
    where: { status: 'Pending' },
    include: {
      endorsement: {
        include: {
          project: { select: { projectName: true } },
          country: { select: { countryName: true, countryCurrencySymbol: true } },
          tierBand: true,
        },
      },
      teamLead: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns a single Hiring record with its full endorsement detail.
 * Used by the detail page in Execute mode.
 */
export async function getHiringById(id: number) {
  return prisma.hiring.findUnique({
    where: { id },
    include: {
      endorsement: {
        include: {
          project: { select: { projectName: true } },
          country: { select: { countryName: true, countryCurrencySymbol: true, countryIso: true } },
          tierBand: true,
          endorsementBonuses: {
            include: {
              bonusSubcategory: {
                include: {
                  bonusCategory: true,
                },
              },
            },
          },
        },
      },
      teamLead: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
    },
  });
}

/**
 * Returns the Hiring record (if any) linked to a given Endorsement, with the
 * same include shape as `getHiringById`. When the found hiring's status is
 * "Processed", also resolves the TeamMember created by it (matched on
 * workdayId) so the frontend can link straight to the resulting profile.
 */
export async function getHiringByEndorsementId(endorsementId: number) {
  const hiring = await prisma.hiring.findFirst({
    where: { endorsementId },
    include: {
      endorsement: {
        include: {
          project: { select: { projectName: true } },
          country: { select: { countryName: true, countryCurrencySymbol: true, countryIso: true } },
          tierBand: true,
          endorsementBonuses: {
            include: {
              bonusSubcategory: {
                include: {
                  bonusCategory: true,
                },
              },
            },
          },
        },
      },
      teamLead: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!hiring) return null;

  let processedTeamMember: { teamMemberId: number; teamMemberNames: string; teamMemberSurnames: string } | null = null;

  if (hiring.status === 'Processed' && hiring.workdayId) {
    processedTeamMember = await prisma.teamMember.findFirst({
      where: { workdayId: hiring.workdayId },
      select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true },
    });
  }

  return { ...hiring, processedTeamMember };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface CreateHiringInput {
  endorsementId: number;
  startDate: Date;
  billableDate: Date;
  workdayId?: string | null;
  teamLeadId?: number | null;
  currencySymbol?: string | null;
  createdBy: string;
}

/**
 * Inserts a new Hiring record with status "Pending".
 */
export async function createHiring(input: CreateHiringInput) {
  return prisma.hiring.create({
    data: {
      endorsementId: input.endorsementId,
      startDate: input.startDate,
      billableDate: input.billableDate,
      workdayId: input.workdayId ?? null,
      teamLeadId: input.teamLeadId ?? null,
      currencySymbol: input.currencySymbol ?? null,
      createdBy: input.createdBy,
      status: 'Pending',
    },
    include: {
      endorsement: {
        include: {
          project: { select: { projectName: true } },
          country: { select: { countryName: true, countryCurrencySymbol: true } },
          tierBand: true,
        },
      },
      teamLead: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
    },
  });
}

export interface ExecuteHiringInput {
  startDate?: Date;
  billableDate?: Date;
  workdayId?: string | null;
  teamLeadId?: number | null;
  currencySymbol?: string | null;
  updatedBy: string;
}

/**
 * Updates an existing Hiring record and sets its status to "Processed".
 * Accepts a Prisma transaction client so it can participate in the
 * orchestrator's atomic hiring-execution transaction.
 */
export async function executeHiring(tx: Prisma.TransactionClient, id: number, input: ExecuteHiringInput) {
  return tx.hiring.update({
    where: { id },
    data: {
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.billableDate !== undefined && { billableDate: input.billableDate }),
      ...(input.workdayId !== undefined && { workdayId: input.workdayId }),
      ...(input.teamLeadId !== undefined && { teamLeadId: input.teamLeadId }),
      ...(input.currencySymbol !== undefined && { currencySymbol: input.currencySymbol }),
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
      status: 'Processed',
    },
    include: {
      endorsement: {
        include: {
          project: { select: { projectName: true } },
          country: { select: { countryName: true, countryCurrencySymbol: true } },
          tierBand: true,
        },
      },
      teamLead: { select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true } },
    },
  });
}
