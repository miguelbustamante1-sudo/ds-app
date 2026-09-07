export class SelfAssignmentError extends Error {
  constructor() {
    super('A team member cannot be their own authorizer');
    this.name = 'SelfAssignmentError';
  }
}

export function validateSelfAssignment(teamMemberWdid: string, authorizerWdid: string): void {
  if (teamMemberWdid === authorizerWdid) {
    throw new SelfAssignmentError();
  }
}
