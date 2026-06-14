export interface TeamMemberSummary {
  teamMemberId: number;
  fullName: string;
  knownAs: string | null;
  position: string | null;
  country: string | null;
  seniority: string;
  startDate: string;
}

export interface TeamMemberProfile extends TeamMemberSummary {
  names: string;
  surnames: string;
  endDate: string | null;
  active: boolean;
  supervisor: { teamMemberId: number; fullName: string } | null;
}

export interface TimeOffChangedField {
  field: string;
  from: string | null;
  to: string | null;
}

export interface TimeOffChangeEntry {
  createdAt: string;
  comment: string;
  changedFields: TimeOffChangedField[];
}

export interface TimeOffSummary {
  timeOffId: number;
  startDate: string;
  endDate: string;
  days: number;
  category: string | null;
  status: string | null;
  changelog: TimeOffChangeEntry[];
}
