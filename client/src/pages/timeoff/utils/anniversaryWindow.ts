export function computeAnniversaryWindow(
  teamMemberStartDate: Date,
  today: Date = new Date()
): { windowStart: Date; windowEnd: Date } {
  const currentYear = today.getFullYear();
  const month = teamMemberStartDate.getUTCMonth();
  const day = teamMemberStartDate.getUTCDate();

  const thisYearAnniversary = new Date(Date.UTC(currentYear, month, day));

  const windowStart =
    today >= thisYearAnniversary
      ? thisYearAnniversary
      : new Date(Date.UTC(currentYear - 1, month, day));

  const windowEnd = new Date(
    Date.UTC(
      windowStart.getUTCFullYear() + 1,
      windowStart.getUTCMonth(),
      windowStart.getUTCDate() - 1
    )
  );

  return { windowStart, windowEnd };
}

export function getNextAnniversaryDate(
  teamMemberStartDate: Date,
  today: Date = new Date()
): Date {
  const { windowEnd } = computeAnniversaryWindow(teamMemberStartDate, today);
  return new Date(Date.UTC(
    windowEnd.getUTCFullYear(),
    windowEnd.getUTCMonth(),
    windowEnd.getUTCDate() + 1
  ));
}

export function computeCurrentPeriod(
  teamMemberStartDate: Date | null,
  referenceDate: Date = new Date()
): string | null {
  if (!teamMemberStartDate) return null;
  const { windowStart, windowEnd } = computeAnniversaryWindow(teamMemberStartDate, referenceDate);
  return `${windowStart.getUTCFullYear()}-${windowEnd.getUTCFullYear()}`;
}
