/**
 * Dashboard Tasks Service
 *
 * Returns action items that require the authenticated user's attention:
 *   - Pending Time Off requests from their direct reports
 *   - Pending Holiday Swap requests from their direct reports
 *   - Team members without a supervisor assignment
 *   - Pending Endorsements (status = 'Pending')
 *
 * Each item includes:
 *   - id, type, title, source, createdAt, dueDate, isOverdue
 */

import { prisma } from '../../db/prisma';
import { loadStatusIds } from '../holidaySwap/components/LoadStatusIds';
import { getReportsForPendingRequests } from '../teamMember/queries/getReportsForPendingRequests';

export interface DashboardTask {
  id: string;
  type: 'TimeOff' | 'HolidaySwap' | 'MissingSupervisor' | 'Endorsement';
  title: string;
  source: string;
  ageLabel: string;
  dueDate: string;
  isOverdue: boolean;
}

function getAgeLabel(createdAt: Date | null): string {
  if (!createdAt) return '';
  const diffMs = Date.now() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} day(s) ago`;
}

function getDueDate(createdAt: Date | null, daysAllowed = 5): { dueDate: string; isOverdue: boolean } {
  if (!createdAt) return { dueDate: '', isOverdue: false };
  const due = new Date(createdAt.getTime() + daysAllowed * 24 * 60 * 60 * 1000);
  const isOverdue = due < new Date();
  const dueStr = due.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  return { dueDate: dueStr, isOverdue };
}

export async function getDashboardTasks(supervisorId: number): Promise<DashboardTask[]> {
  const tasks: DashboardTask[] = [];

  const [statuses, members] = await Promise.all([
    loadStatusIds(),
    getReportsForPendingRequests(supervisorId),
  ]);

  const tentativeStatusId = statuses.pending;
  const memberIds = members.map((m) => m.teamMemberId);

  // 1. Pending Time Off requests
  if (memberIds.length > 0) {
    const pendingTimeOffs = await prisma.timeOff.findMany({
      where: {
        teamMemberId: { in: memberIds },
        statusId: tentativeStatusId,
        timeOffActive: 1,
      },
      include: {
        teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        category: { select: { categoryName: true } },
      },
      orderBy: { timeOffCreatedDate: 'desc' },
    });

    for (const t of pendingTimeOffs) {
      const name = `${t.teamMember?.teamMemberNames ?? ''} ${t.teamMember?.teamMemberSurnames ?? ''}`.trim();
      const days = Number(t.timeOffDays);
      const createdAt = t.timeOffCreatedDate ? new Date(t.timeOffCreatedDate) : null;
      const { dueDate, isOverdue } = getDueDate(createdAt, 3);
      tasks.push({
        id: `tto-${t.timeOffId}`,
        type: 'TimeOff',
        title: `Time Off Request pending approval — ${name} (${days} day${days !== 1 ? 's' : ''})`,
        source: 'My Tasks',
        ageLabel: getAgeLabel(createdAt),
        dueDate,
        isOverdue,
      });
    }
  }

  // 2. Pending Holiday Swap requests
  if (memberIds.length > 0) {
    const pendingSwaps = await prisma.holidaySwap.findMany({
      where: {
        teamMemberId: { in: memberIds },
        statusId: tentativeStatusId,
        active: true,
      },
      include: {
        teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        holiday: { select: { holidayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const s of pendingSwaps) {
      const name = `${s.teamMember?.teamMemberNames ?? ''} ${s.teamMember?.teamMemberSurnames ?? ''}`.trim();
      const createdAt = s.createdAt ? new Date(s.createdAt) : null;
      const { dueDate, isOverdue } = getDueDate(createdAt, 3);
      tasks.push({
        id: `hsw-${s.holidaySwapId}`,
        type: 'HolidaySwap',
        title: `Holiday Swap pending approval — ${name} (${s.holiday.holidayName})`,
        source: 'My Tasks',
        ageLabel: getAgeLabel(createdAt),
        dueDate,
        isOverdue,
      });
    }
  }

  // 3. Team members without a supervisor assignment (active, no open supervisor row)
  const membersWithoutSupervisor = await prisma.teamMember.findMany({
    where: {
      teamMemberEndDate: null,
      supervisorAssignments: {
        none: {
          supervisorAssignmentEndDate: null,
        },
      },
    },
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      teamMemberCreatedDate: true,
    },
    orderBy: { teamMemberCreatedDate: 'desc' },
    take: 5,
  });

  for (const m of membersWithoutSupervisor) {
    const createdAt = m.teamMemberCreatedDate ? new Date(m.teamMemberCreatedDate) : null;
    const { dueDate, isOverdue } = getDueDate(createdAt, 7);
    tasks.push({
      id: `sup-${m.teamMemberId}`,
      type: 'MissingSupervisor',
      title: `Supervisor Assignment missing — ${m.teamMemberNames} ${m.teamMemberSurnames} added without supervisor`,
      source: 'My Tasks',
      ageLabel: getAgeLabel(createdAt),
      dueDate,
      isOverdue,
    });
  }

  // 4. Pending Endorsements
  const pendingEndorsements = await prisma.endorsement.findMany({
    where: { status: 'Pending' },
    select: {
      endorsementId: true,
      candidateFirstName: true,
      candidateLastName: true,
      createdBy: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const e of pendingEndorsements) {
    const createdAt = e.createdAt ? new Date(e.createdAt) : null;
    const { dueDate, isOverdue } = getDueDate(createdAt, 5);
    tasks.push({
      id: `end-${e.endorsementId}`,
      type: 'Endorsement',
      title: `Endorsement review required — ${e.candidateFirstName} ${e.candidateLastName} (Requester: ${e.createdBy})`,
      source: 'My Tasks',
      ageLabel: getAgeLabel(createdAt),
      dueDate,
      isOverdue,
    });
  }

  return tasks;
}
