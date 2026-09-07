// src/services/laptopInventory/repository.ts
import { Prisma, Laptop, LaptopAssignment } from '@prisma/client';
import { prisma } from '../../db/prisma';
import type { LaptopDTO, LaptopAssignmentDTO } from '../../../shared/dto/LaptopInventory';

const LAPTOP_INCLUDE = {
  assignments: {
    where:   { endDate: null },
    orderBy: { startDate: 'desc' as const },
    take:    1,
    include: {
      teamMember: {
        select: { teamMemberNames: true, teamMemberSurnames: true },
      },
    },
  },
} satisfies Prisma.LaptopInclude;

export type LaptopRow = Prisma.LaptopGetPayload<{
  include: typeof LAPTOP_INCLUDE;
}>;

type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export function mapToDTO(row: LaptopRow): LaptopDTO {
  const assignment = row.assignments[0] ?? null;

  let activeAssignment: LaptopAssignmentDTO | null = null;
  if (assignment !== null && assignment.teamMemberId !== null && assignment.teamMember !== null) {
    activeAssignment = {
      assignmentId:       assignment.assignmentId,
      teamMemberId:       assignment.teamMemberId,
      teamMemberNames:    assignment.teamMember.teamMemberNames,
      teamMemberSurnames: assignment.teamMember.teamMemberSurnames,
      startDate:          assignment.startDate,
      notes:              assignment.notes,
    };
  }

  return {
    laptopId:        row.laptopId,
    serialNumber:    row.serialNumber,
    assetNumber:     row.assetNumber,
    model:           row.model,
    brand:           row.brand,
    code:            row.code,
    ramGb:           row.ramGb,
    storageGb:       row.storageGb,
    region:          row.region,
    purchaseDate:    row.purchaseDate,
    po:              row.po,
    usable:          row.usable,
    category:        row.category,
    site:            row.site,
    status:          row.status,
    comments:        row.comments,
    deviceName:      row.deviceName,
    osVersion:       row.osVersion,
    blueprintName:   row.blueprintName,
    tags:            row.tags,
    lastCheckIn:     row.lastCheckIn,
    createdDate:     row.createdDate,
    updatedDate:     row.updatedDate,
    activeAssignment,
  };
}

export async function findAllLaptops(): Promise<LaptopRow[]> {
  return prisma.laptop.findMany({
    where:   { deleted: false },
    include: LAPTOP_INCLUDE,
    orderBy: { serialNumber: 'asc' },
  });
}

export async function findLaptopById(laptopId: number): Promise<LaptopRow | null> {
  return prisma.laptop.findFirst({
    where:   { laptopId, deleted: false },
    include: LAPTOP_INCLUDE,
  });
}

export async function findActiveAssignment(laptopId: number): Promise<LaptopAssignment | null> {
  return prisma.laptopAssignment.findFirst({
    where:   { laptopId, endDate: null },
    orderBy: { startDate: 'desc' },
  });
}

export async function insertLaptop(
  data: {
    serialNumber: string;
    assetNumber:  string | null;
    model:        string | null;
    brand:        string | null;
    code:         string | null;
    ramGb:        string | null;
    storageGb:    string | null;
    region:       string | null;
    purchaseDate: Date | null;
    po:           string | null;
    usable:       boolean;
    category:     string | null;
    site:         string | null;
    status:       string;
    comments:     string | null;
    deviceName:   string | null;
    osVersion:    string | null;
    blueprintName: string | null;
    tags:         string[];
    lastCheckIn:  Date | null;
    createdBy:    number;
    createdDate:  Date;
  },
  tx: Tx = prisma,
): Promise<Laptop> {
  return tx.laptop.create({ data });
}

export async function insertLaptopAssignment(
  data: {
    laptopId:     number;
    teamMemberId: number | null;
    startDate:    Date;
    endDate:      Date | null;
    notes:        string | null;
    createdBy:    number;
    createdDate:  Date;
  },
  tx: Tx = prisma,
): Promise<LaptopAssignment> {
  return tx.laptopAssignment.create({ data });
}

export async function patchLaptop(
  laptopId: number,
  data: {
    assetNumber?: string | null;
    model?: string | null;
    brand?: string | null;
    code?: string | null;
    ramGb?: string | null;
    storageGb?: string | null;
    region?: string | null;
    purchaseDate?: Date | null;
    po?: string | null;
    usable?: boolean;
    category?: string | null;
    site?: string | null;
    status?: string;
    comments?: string | null;
    deviceName?: string | null;
    osVersion?: string | null;
    blueprintName?: string | null;
    tags?: string[];
    lastCheckIn?: Date | null;
    deleted?: boolean;
    updatedBy?: number;
    updatedDate?: Date;
  },
  tx: Tx = prisma,
): Promise<Laptop> {
  return tx.laptop.update({ where: { laptopId }, data });
}

export async function patchLaptopAssignment(
  assignmentId: number,
  data: {
    endDate?: Date | null;
    notes?: string | null;
    updatedBy?: number;
    updatedDate?: Date;
  },
  tx: Tx = prisma,
): Promise<LaptopAssignment> {
  return tx.laptopAssignment.update({ where: { assignmentId }, data });
}

export async function softDeleteLaptop(
  laptopId: number,
  data: { updatedBy: number; updatedDate: Date },
  tx: Tx = prisma,
): Promise<Laptop> {
  return tx.laptop.update({
    where: { laptopId },
    data:  { deleted: true, ...data },
  });
}
