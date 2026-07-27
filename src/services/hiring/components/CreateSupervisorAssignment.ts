import { Prisma, SupervisorAssignment } from '@prisma/client';
import { validateSelfAssignment } from '../../supervisorAssignment/components/ValidateSelfAssignment';

export interface CreateSupervisorAssignmentInput {
  teamMemberId: number;    // the team member created earlier in this same execute transaction
  supervisorId: number;    // hiring.teamLeadId
  startDate: Date;         // hiring.startDate — supervisor assignment is effective from the hire start date
  createdByUserId: number; // req.user.dsUserId
}

export async function createSupervisorAssignment(
  tx: Prisma.TransactionClient,
  input: CreateSupervisorAssignmentInput,
): Promise<SupervisorAssignment> {
  const { teamMemberId, supervisorId, startDate, createdByUserId } = input;

  validateSelfAssignment(teamMemberId, supervisorId);

  return tx.supervisorAssignment.create({
    data: {
      teamMemberId,
      supervisorId,
      supervisorAssignmentStartDate: startDate,
      supervisorAssignmentCreatedBy: createdByUserId,
      supervisorAssignmentCreatedDate: new Date(),
    },
  });
}
