export interface SupervisorCoverageTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export interface SupervisorCoverageDTO {
  supervisorCoverageId: number;
  fromSupervisorId: number;
  toSupervisorId: number;
  coverageStartDate: Date;
  coverageEndDate: Date | null;
  coverageEndedAt: Date | null;
  coverageEndedBy: number | null;
  coverageCreatedBy: number;
  coverageCreatedAt: Date;
  coverageUpdatedBy: number | null;
  coverageUpdatedAt: Date | null;
  fromSupervisor: SupervisorCoverageTeamMemberInfo;
  toSupervisor: SupervisorCoverageTeamMemberInfo;
}

export interface CreateSupervisorCoverageDTO {
  fromSupervisorId: number;
  toSupervisorId: number;
  coverageStartDate: Date | string;
  coverageEndDate?: Date | string | null;
}
