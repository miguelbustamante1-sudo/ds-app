/**
 * Validates that ending a bench record is permissible before any DB mutations occur.
 *
 * Checks (in order):
 * 1. The Bench record with benchId exists.
 * 2. The record is still open (endDate IS NULL).
 * 3. The provided endDate >= Bench.startDate.
 *
 * Returns the fetched bench record on success so the orchestrator can reuse it
 * without a redundant second DB fetch.
 */

import { prisma } from '../../../db/prisma';
import type { Bench } from '@prisma/client';

export class EndBenchValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'EndBenchValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * @param benchId - The ID of the bench record to close
 * @param endDate - ISO date string for the closing date
 * @throws EndBenchValidationError with an appropriate statusCode
 */
export async function validateEndBench(
  benchId: number,
  endDate: string,
): Promise<{ bench: Bench }> {
  // 1. Record must exist
  const bench = await prisma.bench.findUnique({
    where: { id: benchId },
  });
  if (!bench) {
    throw new EndBenchValidationError('Bench record not found', 404);
  }

  // 2. Record must still be open
  if (bench.endDate !== null) {
    throw new EndBenchValidationError('Bench record is already closed', 400);
  }

  // 3. endDate must be on or after startDate
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(bench.startDate);
  if (endDateObj < startDateObj) {
    throw new EndBenchValidationError(
      'End date must be on or after the bench start date',
      400,
    );
  }

  return { bench };
}
