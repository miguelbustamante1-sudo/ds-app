/**
 * Formats an ISO date string (e.g. "2026-03-02T06:00:00.000Z") to dd/MM/yyyy.
 * Splits on "T" to avoid timezone shifts from `new Date()`.
 */
export function formatDateDDMMYYYY(isoString: string): string {
  const datePart = isoString.split('T')[0] ?? isoString; // "2026-03-02"
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}
