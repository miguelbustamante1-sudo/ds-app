/**
 * Self-Assignment Validation Component
 * Prevents a team member from being assigned as their own supervisor
 */

export class SelfAssignmentError extends Error {
  constructor() {
    super('A team member cannot supervise themselves');
    this.name = 'SelfAssignmentError';
  }
}

export function validateSelfAssignment(teamMemberId: number, supervisorId: number): void {
  if (teamMemberId === supervisorId) {
    throw new SelfAssignmentError();
  }
}
