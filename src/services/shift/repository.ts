import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import type { ShiftDTO } from '../../../shared/dto/Shift';
import type { ShiftDetailDTO } from '../../../shared/dto/ShiftDetail';
import type { CreateShiftInput, UpdateShiftInput, UpdateShiftDetailInput } from './components/ValidateShiftInput';

type ShiftDetailRow = {
  shiftDetailId: number;
  shiftId:       number;
  dayOfWeek:     number;
  startTime:     number;
  endTime:       number;
  workingHours:  Prisma.Decimal;
};

type ShiftRow = {
  shiftId:        number;
  description:    string;
  totalWeekHours: Prisma.Decimal;
  lunchHours:     Prisma.Decimal;
  details:        ShiftDetailRow[];
};

const SHIFT_SELECT = {
  shiftId:        true,
  description:    true,
  totalWeekHours: true,
  lunchHours:     true,
  details: {
    select: {
      shiftDetailId: true,
      shiftId:       true,
      dayOfWeek:     true,
      startTime:     true,
      endTime:       true,
      workingHours:  true,
    },
    orderBy: { dayOfWeek: 'asc' as const },
  },
};

const DETAIL_SELECT = {
  shiftDetailId: true,
  shiftId:       true,
  dayOfWeek:     true,
  startTime:     true,
  endTime:       true,
  workingHours:  true,
};

function mapShiftRow(r: ShiftRow): ShiftDTO {
  return {
    shiftId:        r.shiftId,
    description:    r.description,
    totalWeekHours: Number(r.totalWeekHours),
    lunchHours:     Number(r.lunchHours),
    details: r.details.map((d) => ({
      shiftDetailId: d.shiftDetailId,
      shiftId:       d.shiftId,
      dayOfWeek:     d.dayOfWeek,
      startTime:     d.startTime,
      endTime:       d.endTime,
      workingHours:  Number(d.workingHours),
    })),
  };
}

export async function getAllShifts(): Promise<ShiftDTO[]> {
  const rows = await prisma.shift.findMany({
    select:  SHIFT_SELECT,
    orderBy: { shiftId: 'asc' },
  }) as ShiftRow[];
  return rows.map(mapShiftRow);
}

export async function getShiftById(id: number): Promise<ShiftDTO | null> {
  const row = await prisma.shift.findUnique({ where: { shiftId: id }, select: SHIFT_SELECT }) as ShiftRow | null;
  if (!row) return null;
  return mapShiftRow(row);
}

export async function createShift(data: CreateShiftInput): Promise<ShiftDTO> {
  const hasDetails = Array.isArray(data.details) && data.details.length > 0;

  if (!hasDetails) {
    const row = await prisma.shift.create({
      data: {
        description:    data.description,
        totalWeekHours: data.totalWeekHours,
        lunchHours:     data.lunchHours,
      },
      select: SHIFT_SELECT,
    }) as ShiftRow;
    return mapShiftRow(row);
  }

  const row = await prisma.shift.create({
    data: {
      description:    data.description,
      totalWeekHours: data.totalWeekHours,
      lunchHours:     data.lunchHours,
      details: {
        create: (data.details as NonNullable<typeof data.details>).map((d) => ({
          dayOfWeek:    d.dayOfWeek,
          startTime:    d.startTime,
          endTime:      d.endTime,
          workingHours: d.workingHours,
        })),
      },
    },
    select: SHIFT_SELECT,
  }) as ShiftRow;
  return mapShiftRow(row);
}

export async function updateShift(
  id:   number,
  data: UpdateShiftInput,
): Promise<ShiftDTO | null> {
  try {
    const row = await prisma.shift.update({
      where: { shiftId: id },
      data: {
        ...(data.description    !== undefined && { description:    data.description }),
        ...(data.totalWeekHours !== undefined && { totalWeekHours: data.totalWeekHours }),
        ...(data.lunchHours     !== undefined && { lunchHours:     data.lunchHours }),
      },
      select: SHIFT_SELECT,
    }) as ShiftRow;
    return mapShiftRow(row);
  } catch {
    return null;
  }
}

export async function updateShiftDetail(
  shiftId:  number,
  detailId: number,
  data:     UpdateShiftDetailInput,
): Promise<ShiftDetailDTO | null> {
  try {
    const row = await prisma.shiftDetail.update({
      where: { shiftDetailId: detailId, shiftId },
      data: {
        ...(data.dayOfWeek    !== undefined && { dayOfWeek:    data.dayOfWeek }),
        ...(data.startTime    !== undefined && { startTime:    data.startTime }),
        ...(data.endTime      !== undefined && { endTime:      data.endTime }),
        ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
      },
      select: DETAIL_SELECT,
    }) as ShiftDetailRow;
    return {
      shiftDetailId: row.shiftDetailId,
      shiftId:       row.shiftId,
      dayOfWeek:     row.dayOfWeek,
      startTime:     row.startTime,
      endTime:       row.endTime,
      workingHours:  Number(row.workingHours),
    };
  } catch {
    return null;
  }
}

export async function deleteShift(id: number): Promise<boolean> {
  try {
    await prisma.shift.delete({ where: { shiftId: id } });
    return true;
  } catch {
    return false;
  }
}
