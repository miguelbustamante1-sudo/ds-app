export interface AuthorizerAssignmentTeamMemberInfo {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export interface AuthorizerAssignmentDTO {
  authorizerAssignmentId: number;
  teamMemberWdid: string;
  authorizerWdid: string;
  authorizerAssignmentStartDate: Date;
  authorizerAssignmentEndDate: Date | null;
  authorizerAssignmentCreatedBy: number;
  authorizerAssignmentCreatedDate: Date;
  authorizerAssignmentLastUpdatedBy: number | null;
  authorizerAssignmentLastUpdatedDate: Date | null;
  teamMember: AuthorizerAssignmentTeamMemberInfo;
  authorizer: AuthorizerAssignmentTeamMemberInfo;
}

/**
 * Excludes: authorizerAssignmentId (auto), audit fields (server-populated), expanded relations (read-only)
 */
export interface CreateAuthorizerAssignmentDTO {
  teamMemberWdid: string;
  authorizerWdid: string;
  authorizerAssignmentStartDate: Date | string;
  authorizerAssignmentEndDate?: Date | string | null;
}

export interface UpdateAuthorizerAssignmentDTO {
  teamMemberWdid?: string;
  authorizerWdid?: string;
  authorizerAssignmentStartDate?: Date | string;
  authorizerAssignmentEndDate?: Date | string | null;
}
