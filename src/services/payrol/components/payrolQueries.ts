import { prisma } from '../../../db/prisma';
import { PayrolDTO } from '../../../../shared/dto/Payrol';

export function toDTO(r: {
  prlId: number;
  prlDescription: string;
  prlStartDate: Date;
  prlEndDate: Date;
  prlMonth: number;
  prlYear: number;
  prlFrequency: number | null;
  prlStatus: string;
  prlCreatedAt: Date;
}): PayrolDTO {
  return {
    prlId: r.prlId,
    prlDescription: r.prlDescription,
    prlStartDate: r.prlStartDate.toISOString(),
    prlEndDate: r.prlEndDate.toISOString(),
    prlMonth: r.prlMonth,
    prlYear: r.prlYear,
    prlFrequency: r.prlFrequency,
    prlStatus: r.prlStatus as PayrolDTO['prlStatus'],
    prlCreatedAt: r.prlCreatedAt.toISOString(),
  };
}

export async function listPayrols(): Promise<PayrolDTO[]> {
  const rows = await prisma.prlPayrol.findMany({
    where: { prlDeletedAt: null },
    orderBy: { prlStartDate: 'desc' },
  });
  return rows.map(toDTO);
}

export async function findPayrolById(prlId: number): Promise<PayrolDTO | null> {
  const row = await prisma.prlPayrol.findFirst({
    where: { prlId, prlDeletedAt: null },
  });
  return row ? toDTO(row) : null;
}
