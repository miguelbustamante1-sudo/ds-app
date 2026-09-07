/**
 * Dashboard Supervisor Flags Service
 *
 * Sources the "Weekly Flags" panel from real StandaloneTask rows whose
 * taskReferenceType contains 'FLAG' (CSV intake's 'FLAG_INTAKE', the manual
 * task dialog's plain 'FLAG', or any future flag-related value — see
 * FLAG_TASK_REFERENCE_TYPE_KEYWORD), scoped to the caller's own direct
 * reports via getReportsForDashboardFlags. No unscoped data ever reaches the
 * route — there is nothing left for the frontend to filter.
 *
 * Field mapping (see src/services/flag-intake for how these get populated):
 * - category   <- taskTitle. The flag-intake "Report" CSV column doubles as a
 *                 category/type label in practice (e.g. "1o1 Tracking",
 *                 "WD vs SFR Crossmatch") — confirmed from production data.
 * - issue      <- taskDescription's first line. buildDescription() in
 *                 SubmitFlagIntake always writes `${category}\n${concatenate}\n${meta}`,
 *                 so splitting on the first '\n' reliably recovers the CSV's
 *                 `category` column regardless of flag type. The rest of the
 *                 description (the raw `concatenate` value) varies in shape
 *                 per flag type and is deliberately NOT parsed here.
 * - teamMember/workdayId <- hierarchyContext, the flagged team member (not the
 *                 assignee) — resolved via a real FK, not text parsing.
 * - weeksOpen  <- age of the flag in weeks, computed from createdDate.
 * - action     <- looked up LIVE from FlagTypeAction by category (task.taskTitle),
 *                 not stored on the task. A single indexed IN(...) lookup across
 *                 the distinct categories present, not a per-row query. This means
 *                 an admin fixing a wrong link reaches every currently-open flag
 *                 immediately, since flags can stay open for months.
 * - detail     <- task.parsedDetail, computed once at task creation by
 *                 resolveFlagDetail (deterministic per-category parser with an
 *                 AI fallback) and cached — never parsed or called here. `null`
 *                 for flags created before this field existed.
 */

import type { FlagDetailItemDTO, SupervisorFlagDTO } from '@shared/dto';
import { getReportsForDashboardFlags } from '../teamMember/queries/getReportsForDashboardFlags';
import { standaloneTaskOrchestrator } from '../standalone-tasks/StandaloneTaskOrchestrator';
import { getFlagTypeActionsByCategories } from '../flagTypeActions/repository';
import { getTeamLeaderOrOmNames } from '../teamMember/queries/getTeamLeaderOrOmNames';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function firstDescriptionLine(description: string | null): string {
  if (!description) return '';
  const newlineIndex = description.indexOf('\n');
  return newlineIndex === -1 ? description : description.slice(0, newlineIndex);
}

export async function getSupervisorFlags(supervisorId: number): Promise<SupervisorFlagDTO[]> {
  const reports = await getReportsForDashboardFlags(supervisorId);
  if (reports.length === 0) return [];

  const flagTasks = await standaloneTaskOrchestrator.getFlagsForReports(
    reports.map((r) => r.teamMemberId),
  );

  const now = Date.now();

  const distinctCategories = [...new Set(flagTasks.map((t) => t.taskTitle))];
  const actionRows = await getFlagTypeActionsByCategories(distinctCategories);
  const actionByCategory = new Map(actionRows.map((a) => [a.category, a]));

  const distinctWorkdayIds = [
    ...new Set(
      flagTasks
        .map((t) => t.hierarchyContextWorkdayId)
        .filter((wdid): wdid is string => wdid !== null),
    ),
  ];
  const tlOmByWorkdayId = await getTeamLeaderOrOmNames(distinctWorkdayIds);

  return flagTasks.map((task) => {
    const action = actionByCategory.get(task.taskTitle);
    return {
      id: task.taskId.toString(),
      category: task.taskTitle,
      teamMember: `${task.hierarchyContextNames ?? ''} ${task.hierarchyContextSurnames ?? ''}`.trim(),
      workdayId: task.hierarchyContextWorkdayId ?? '',
      issue: firstDescriptionLine(task.taskDescription),
      weeksOpen: Math.floor((now - task.createdDate.getTime()) / MS_PER_WEEK),
      action: action ? { label: action.actionLabel, url: action.actionUrl } : null,
      detail: (task.parsedDetail as FlagDetailItemDTO[] | null) ?? null,
      tlOmName: task.hierarchyContextWorkdayId
        ? (tlOmByWorkdayId.get(task.hierarchyContextWorkdayId) ?? null)
        : null,
    };
  });
}
