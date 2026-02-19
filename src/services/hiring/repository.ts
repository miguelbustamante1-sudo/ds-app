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
          country: { select: { countryName: true, countryCurrencySymbol: true } },
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
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface CreateHiringInput {
  endorsementId: number;
  startDate: Date;
  billableDate: Date;
  workdayId?: string | null;
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
    },
  });
}

export interface ExecuteHiringInput {
  startDate?: Date;
  billableDate?: Date;
  workdayId?: string | null;
  currencySymbol?: string | null;
  updatedBy: string;
}

/**
 * Updates an existing Hiring record and sets its status to "Processed".
 */
export async function executeHiring(id: number, input: ExecuteHiringInput) {
  return prisma.hiring.update({
    where: { id },
    data: {
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.billableDate !== undefined && { billableDate: input.billableDate }),
      ...(input.workdayId !== undefined && { workdayId: input.workdayId }),
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
    },
  });
}
