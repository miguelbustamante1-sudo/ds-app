import { Prisma } from '@prisma/client';

export interface CreateTeamMemberInput {
  candidateFirstName: string;  // endorsement.candidateFirstName
  candidateLastName: string;   // endorsement.candidateLastName
  startDate: Date;             // hiring.startDate
  countryId: number;           // endorsement.countryId
  workdayId: string;           // hiring.workdayId (guaranteed non-null at this stage)
  seniority: string;           // endorsement.tierBand.tierBandDescription
  tierBandId: number;          // endorsement.tibId
  createdByUserId: number;     // req.user.dsUserId
}

export async function createTeamMember(
  tx: Prisma.TransactionClient,
  input: CreateTeamMemberInput,
) {
  const {
    candidateFirstName,
    candidateLastName,
    startDate,
    countryId,
    workdayId,
    seniority,
    tierBandId,
    createdByUserId,
  } = input;

  return tx.teamMember.create({
    data: {
      teamMemberNames: candidateFirstName,
      teamMemberSurnames: candidateLastName,
      teamMemberKnownAs: candidateFirstName,
      teamMemberStartDate: startDate,
      countryId,
      workdayId,
      teamMemberSeniority: seniority,
      tierBandId,
      teamMemberCreatedBy: createdByUserId,
      teamMemberCreatedDate: new Date(),
    },
  });
}
