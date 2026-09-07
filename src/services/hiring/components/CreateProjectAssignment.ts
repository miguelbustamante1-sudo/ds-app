import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';

export interface CreateProjectAssignmentInput {
  teamMemberId: number;     // returned by CreateTeamMember
  projectId: number;        // endorsement.projectId
  startDate: Date;          // hiring.startDate
  billableDate: Date;       // hiring.billableDate
  billRate: number;         // endorsement.billingRate
  currencySymbol: string;   // resolved currency (input → hiring → country → '$')
  createdByUserId: number;  // req.user.dsUserId
}

async function insertAssignment(
  tx: Prisma.TransactionClient,
  data: {
    teamMemberId: number;
    projectId: number;
    startDate: Date;
    endDate: Date | null;
    billRate: number;
    currencySymbol: string;
    createdByUserId: number;
  },
) {
  return tx.projectAssignment.create({
    data: {
      teamMemberId: data.teamMemberId,
      projectId: data.projectId,
      projectAssignmentStartDate: data.startDate,
      projectAssignmentEndDate: data.endDate,
      projectAssignmentBillRate: data.billRate,
      projectAssignmentBillRateCurrency: data.currencySymbol,
      projectAssignmentCreatedBy: data.createdByUserId,
      projectAssignmentCreatedDate: new Date(),
      projectAssignmentAllocation: 100,
    },
  });
}

export async function createProjectAssignment(
  tx: Prisma.TransactionClient,
  input: CreateProjectAssignmentInput,
) {
  const {
    teamMemberId,
    projectId,
    startDate,
    billableDate,
    billRate,
    currencySymbol,
    createdByUserId,
  } = input;

  const startDay   = dayjs(startDate).startOf('day');
  const billableDay = dayjs(billableDate).startOf('day');

  if (startDay.isSame(billableDay)) {
    // Single assignment — billable from day one
    const assignment = await insertAssignment(tx, {
      teamMemberId,
      projectId,
      startDate: billableDate,
      endDate: null,
      billRate,
      currencySymbol,
      createdByUserId,
    });

    return [assignment];
  }

  // Two assignments: non-billable ramp period, then billable
  const nonBillableEnd = billableDay.subtract(1, 'day').toDate();

  const nonBillable = await insertAssignment(tx, {
    teamMemberId,
    projectId,
    startDate,
    endDate: nonBillableEnd,
    billRate: 0,
    currencySymbol,
    createdByUserId,
  });

  const billable = await insertAssignment(tx, {
    teamMemberId,
    projectId,
    startDate: billableDate,
    endDate: null,
    billRate,
    currencySymbol,
    createdByUserId,
  });

  return [nonBillable, billable];
}
