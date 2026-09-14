export interface CaseDisplayInput {
  caseCode: string;
  caseLabel: string | null;
  teamMemberNames?: string | null;
  teamMemberSurnames?: string | null;
  teamMemberWorkdayId?: string | null;
}

export function formatTeamMemberDisplay(
  names: string | null | undefined,
  surnames: string | null | undefined,
  workdayId: string | null | undefined,
): string | null {
  const fullName = `${names ?? ''} ${surnames ?? ''}`.trim();
  if (!fullName) return null;
  return workdayId ? `${fullName} (${workdayId})` : fullName;
}

export function formatCaseTitle(input: CaseDisplayInput): string {
  const teamMember = formatTeamMemberDisplay(input.teamMemberNames, input.teamMemberSurnames, input.teamMemberWorkdayId);
  return [teamMember, input.caseCode, input.caseLabel?.trim() || null].filter(Boolean).join(' - ');
}
