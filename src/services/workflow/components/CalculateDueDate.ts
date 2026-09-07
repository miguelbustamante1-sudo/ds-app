export function calculateDueDate(activatedAt: Date, slaDurationHours: number | null): Date | null {
  if (!slaDurationHours || slaDurationHours === 0) return null;
  const due = new Date(activatedAt);
  due.setHours(due.getHours() + slaDurationHours);
  return due;
}
