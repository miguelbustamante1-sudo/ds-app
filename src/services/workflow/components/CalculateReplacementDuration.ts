/**
 * Computes a replacement task's SLA duration from its predecessor's duration
 * and the template's configured reduction percentage. Always rounds up to a
 * whole hour and never returns less than 1.
 */
export function calculateReplacementDuration(previousDurationHours: number, reductionPercentage: number): number {
  const raw = previousDurationHours * (1 - reductionPercentage);
  const rounded = Math.ceil(raw);
  return Math.max(rounded, 1);
}
