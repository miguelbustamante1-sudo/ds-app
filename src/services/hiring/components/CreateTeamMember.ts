import { Prisma } from '@prisma/client';

export interface CreateTeamMemberInput {
  candidateFirstName: string;  // endorsement.candidateFirstName
  candidateLastName: string;   // endorsement.candidateLastName
  startDate: Date;             // hiring.startDate
  countryId: number;           // endorsement.countryId
  workdayId: string;           // hiring.workdayId (guaranteed non-null at this stage)
  seniority: string;           // endorsement.tierBand.tierBandDescription, or mock fallback (TEMP DEMO)
  tierBandId: number | null;   // endorsement.tibId (nullable — TEMP DEMO, Tier/Band not yet required)
  primaryRoleId: number;       // endorsement.posId
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
    primaryRoleId,
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
      teamMemberPrimaryRole: primaryRoleId,
      teamMemberCreatedBy: createdByUserId,
      teamMemberCreatedDate: new Date(),
    },
  });
}
