/**
 * TodoPanel — Dashboard "My To-Do" checklist card
 * ================================================
 *
 * Merges two independent sources into one list: the caller's pending Standalone
 * Tasks (GET /api/standalone-tasks/my-tasks) and their claimed, ACTIVE workflow
 * tasks (GET /api/workflow/inbox). The two queries are independent on purpose —
 * a 403 from the workflow query (no Workflow read permission) must not blank
 * the standalone half.
 *
 * Every row opens a drawer on click rather than resolving directly: standalone
 * rows open ResolveStandaloneTaskDrawer (Approve/Reject, comment, and the
 * recurring-task execution-date flow), workflow rows open TaskExecutionDrawer.
 * Both drawers invalidate this panel's own query on success, which is how a
 * resolved/completed item disappears from the list on the next fetch — /my-tasks
 * only ever returns PENDING tasks, and /api/workflow/inbox is filtered to ACTIVE
 * tasks claimed by the caller.
 *
 * `hierarchyContextNames`/`hierarchyContextSurnames` — who the task is about,
 * distinct from who it's assigned to — is optional and will be null for any
 * task that wasn't created with that field set (see CreateTaskDialog.tsx's
 * "About" field). The row simply omits that line when it's null.
 *
 * Styling uses UDS TELUS semantic tokens only, matching the other dashboard panels.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  ChevronDown,
  Flame,
  CheckCircle2,
  Lock,
  GitBranch,
} from "lucide-react";
import { cn, formatUTCDate } from "@/lib/utils";
import { apiGet, ApiError } from "@/lib/api";
import type { StandaloneTaskDTO } from "@shared/dto";
import type { TaskInboxItem } from "@/pages/workflow/types";
import { TaskExecutionDrawer } from "@/pages/workflow/components/TaskExecutionDrawer";
import { ResolveStandaloneTaskDrawer } from "@/pages/standalone-tasks/components/ResolveStandaloneTaskDrawer";

function fetchMyTasks(): Promise<StandaloneTaskDTO[]> {
  return apiGet<StandaloneTaskDTO[]>("/api/standalone-tasks/my-tasks");
}

function fetchMyWorkflowTasks(): Promise<TaskInboxItem[]> {
  return apiGet<TaskInboxItem[]>("/api/workflow/inbox");
}

/** Common shape both task sources normalize into before rendering. */
interface TodoRowBase {
  key: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  priority: string;
  about: string | null;
}

type TodoRow =
  | (TodoRowBase & { kind: "standalone"; task: StandaloneTaskDTO })
  | (TodoRowBase & { kind: "workflow"; task: TaskInboxItem });

// Keyed by plain string: standalone tasks use StandaloneTaskDTO["taskPriority"] while workflow
// tasks type priority as string (TaskInboxItem.priority). Both use the same four values.
const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function isHighUrgency(priority: string): boolean {
  return priority === "HIGH" || priority === "CRITICAL";
}

export function TodoPanel() {
  const [expanded, setExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWitId, setSelectedWitId] = useState<string | null>(null);
  const [selectedWinId, setSelectedWinId] = useState<string | null>(null);
  const [standaloneDrawerOpen, setStandaloneDrawerOpen] = useState(false);
  const [selectedStandaloneTaskId, setSelectedStandaloneTaskId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {
    data: todos = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboard-my-todos"],
    queryFn: fetchMyTasks,
    staleTime: 60_000,
  });

  // Independent of the standalone query on purpose: a user without Workflow read access gets a
  // 403 here, and that must not blank the panel or surface an error — their standalone tasks
  // still render. retry:false so a 403 fails fast instead of backing off three times.
  const { data: workflowTasks = [] } = useQuery({
    queryKey: ["dashboard-my-workflow-tasks"],
    queryFn: fetchMyWorkflowTasks,
    staleTime: 60_000,
    retry: false,
  });

  const isForbidden = error instanceof ApiError && error.status === 403;

  const rows = useMemo<TodoRow[]>(() => {
    const standaloneRows: TodoRow[] = todos.map((t) => ({
      kind: "standalone",
      key: `standalone-${t.taskId}`,
      title: t.taskTitle,
      description: t.taskDescription,
      dueDate: t.taskDueDate,
      isOverdue: t.isOverdue,
      priority: t.taskPriority,
      about:
        t.hierarchyContextNames && t.hierarchyContextSurnames
          ? `${t.hierarchyContextNames} ${t.hierarchyContextSurnames}`
          : null,
      task: t,
    }));

    // ACTIVE only (PENDING tasks are not yet actionable) and only tasks resolved to me.
    // ROLE tasks have resolvedUserId === null so isClaimedByMe is false — they are excluded
    // here; they're properly scoped by their own PENDING assignee row in /my-tasks instead.
    const workflowRows: TodoRow[] = workflowTasks
      .filter((t) => t.state === "ACTIVE" && t.isClaimedByMe)
      .map((t) => ({
        kind: "workflow",
        key: `workflow-${t.witId}`,
        title: t.witName,
        description: null,
        dueDate: t.dueAt,
        isOverdue: t.isOverdue,
        priority: t.priority,
        about: t.entitySummary,
        task: t,
      }));

    // Overdue first, then soonest due, then undated. Dates are compared as ISO strings rather
    // than parsed — Rule 3.8 forbids new Date(raw) in frontend code, and lexicographic ordering
    // on ISO-8601 is already chronological.
    return [...standaloneRows, ...workflowRows].sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [todos, workflowTasks]);

  const handleOpenStandaloneTask = (taskId: number) => {
    setSelectedStandaloneTaskId(taskId);
    setStandaloneDrawerOpen(true);
  };

  const handleOpenWorkflowTask = (item: TaskInboxItem) => {
    setSelectedWitId(item.witId);
    setSelectedWinId(item.winId);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
        {/* Gradient header */}
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
        >
          <div className="flex items-start gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">My To-Do</span>
                {rows.length > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                    {rows.length} pending
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-white/70">Your open tasks and workflow steps</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse to-do list" : "Expand to-do list"}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !expanded && "-rotate-90",
              )}
            />
          </button>
        </div>
  
        {expanded && (
          <div className="px-5 py-4">
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted" />
                ))}
              </div>
            ) : isForbidden ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  You don't have permission to view your to-do list. Contact your
                  administrator to request access.
                </p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ListChecks className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Couldn't load your to-do list right now. Please try again later.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-uds-telus-green-400" />
                <p className="text-sm text-muted-foreground">
                  Nothing on your list — you're all caught up!
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => {
                  const high = isHighUrgency(row.priority);

                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        onClick={() =>
                          row.kind === "standalone"
                            ? handleOpenStandaloneTask(row.task.taskId)
                            : handleOpenWorkflowTask(row.task)
                        }
                        aria-label={
                          row.kind === "standalone"
                            ? `Open task "${row.title}"`
                            : `Open workflow task "${row.title}"`
                        }
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-all duration-200",
                          "hover:-translate-y-0.5 hover:border-uds-telus-purple-300 hover:bg-uds-telus-purple-50 hover:shadow-[var(--shadow-uds-card)]",
                        )}
                      >
                        {/* Leading affordance: a checkbox for tasks that open a resolve drawer,
                            a workflow glyph for tasks that open the workflow drawer instead. */}
                        {row.kind === "standalone" ? (
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              "border-uds-system-grey-300 bg-card group-hover:border-uds-telus-purple-400",
                            )}
                          />
                        ) : (
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-uds-telus-purple-50">
                            <GitBranch
                              className="h-3.5 w-3.5 text-uds-telus-purple-500"
                              aria-hidden="true"
                            />
                          </span>
                        )}
  
                        {/* Content */}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {row.title}
                            </span>
                            {row.kind === "workflow" && (
                              <span className="inline-flex shrink-0 items-center rounded-full bg-uds-telus-purple-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-uds-telus-purple-600">
                                Workflow
                              </span>
                            )}
                            {high && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-uds-system-red-200 bg-uds-system-red-100 px-2 py-0.5 text-[10px] font-semibold text-uds-system-red-700">
                                <Flame className="h-3 w-3" aria-hidden="true" />
                                {PRIORITY_LABELS[row.priority] ?? row.priority}
                              </span>
                            )}
                          </span>
                          {row.description && (
                            <span className="mt-0.5 block text-sm leading-snug text-foreground/90">
                              {row.description}
                            </span>
                          )}
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                            {row.about && <span>About {row.about}</span>}
                            {row.dueDate && (
                              <span
                                className={cn(
                                  row.isOverdue && "font-semibold text-uds-system-red-600",
                                )}
                              >
                                {row.isOverdue ? "Overdue" : "Due"} {formatUTCDate(row.dueDate)}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <TaskExecutionDrawer
        witId={selectedWitId}
        winId={selectedWinId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTaskUpdated={() => {
          void queryClient.invalidateQueries({
            queryKey: ["dashboard-my-workflow-tasks"],
          });
        }}
        isClaimedByMe
      />

      <ResolveStandaloneTaskDrawer
        taskId={selectedStandaloneTaskId}
        open={standaloneDrawerOpen}
        onOpenChange={setStandaloneDrawerOpen}
        onResolved={() => {
          void queryClient.invalidateQueries({ queryKey: ["dashboard-my-todos"] });
        }}
      />
    </>
  );
}
