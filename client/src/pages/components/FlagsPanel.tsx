/**
 * FlagsPanel — Dashboard "Weekly Flags" panel
 * ============================================
 *
 * Fetches the caller's own direct reports' flags (GET
 * /api/dashboard/supervisor-flags — already scoped server-side, see
 * getSupervisorFlags) and renders each one. A status dot is colored by
 * `weeksOpen` (0 = green/on-time, 1+ = red/overdue). When present, `flag.action`
 * renders as a link (admin-managed per category via the Flag Type Actions
 * maintenance page, e.g. "1o1 Tracking" -> the Monday.com Staff Tasks Board).
 *
 * Styling uses UDS TELUS semantic tokens only, matching the other dashboard panels.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flag,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ResolveFlagDrawer } from "./ResolveFlagDrawer";
import type { SupervisorFlagDTO } from "@shared/dto";

function fetchSupervisorFlags(): Promise<SupervisorFlagDTO[]> {
  return apiGet<SupervisorFlagDTO[]>("/api/dashboard/supervisor-flags");
}

/** On-time (0 weeks) is green; anything open (1+ weeks) is red. */
function isOverdue(weeksOpen: number): boolean {
  return weeksOpen >= 1;
}

function weeksLabel(weeksOpen: number): string {
  if (weeksOpen <= 0) return "On time";
  return `Open ${weeksOpen} week${weeksOpen === 1 ? "" : "s"}`;
}

const PAGE_SIZE = 5;

export function FlagsPanel() {
  const [expanded, setExpanded] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<SupervisorFlagDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const {
    data: flags = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard-supervisor-flags"],
    queryFn: fetchSupervisorFlags,
    staleTime: 60_000,
  });

  const overdueCount = flags.filter((f) => isOverdue(f.weeksOpen)).length;
  const totalPages = Math.max(1, Math.ceil(flags.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedFlags = flags.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      {/* Gradient header */}
      <div
        className="flex items-center justify-between px-5 py-4 text-white"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <div className="flex items-start gap-2">
          <Flag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Weekly Flags</span>
              {flags.length > 0 && (
                <span
                  className={cn(
                    "rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                    flags.length > 1 && "motion-safe:animate-flag-count-pulse",
                  )}
                >
                  {flags.length}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-uds-system-red-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {overdueCount} overdue
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-white/70">From your weekly flags report</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse weekly flags" : "Expand weekly flags"}
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
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Flag className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Couldn't load your flags right now. Please try again later.
              </p>
            </div>
          ) : flags.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-uds-telus-green-50">
                <ShieldCheck className="h-7 w-7 text-uds-telus-green-500" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No open flags — you're all caught up
              </p>
              <p className="text-xs text-muted-foreground">
                New flags for your team will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pagedFlags.map((flag) => {
                const overdue = isOverdue(flag.weeksOpen);

                return (
                  <li
                    key={flag.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-card p-3 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-uds-card)]",
                      overdue
                        ? "border-uds-system-red-200"
                        : "border-uds-system-green-200",
                    )}
                  >
                    {/* Colored status rail */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 left-0 w-1.5",
                        overdue ? "bg-uds-system-red-500" : "bg-uds-system-green-500",
                      )}
                    />

                    <div className="pl-2">
                      {/* Line 1: category chip + status dot + team member */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-uds-telus-purple-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-uds-telus-purple-600">
                          {flag.category}
                        </span>
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                            overdue
                              ? "bg-uds-system-red-500 ring-uds-system-red-100"
                              : "bg-uds-system-green-500 ring-uds-system-green-100",
                          )}
                          role="img"
                          aria-label={weeksLabel(flag.weeksOpen)}
                          title={weeksLabel(flag.weeksOpen)}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                          {flag.teamMember}
                        </span>
                      </div>

                      {/* Line 2: issue (truncated) + weeks-open (never truncated) */}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                          {flag.issue}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            overdue ? "text-uds-system-red-600" : "text-uds-system-green-600",
                          )}
                        >
                          · {weeksLabel(flag.weeksOpen)}
                        </span>
                      </div>

                      {/* Footer: admin-configured action link + Resolve */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {flag.action ? (
                          <a
                            href={flag.action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-uds-telus-purple-600 hover:text-uds-telus-purple-700 hover:underline"
                          >
                            {flag.action.label}
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span aria-hidden="true" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFlag(flag);
                            setDrawerOpen(true);
                          }}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                ‹ Prev
              </Button>
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next ›
              </Button>
            </div>
          )}
        </div>
      )}

      <ResolveFlagDrawer
        flag={selectedFlag}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onResolved={() => {
          void queryClient.invalidateQueries({ queryKey: ["dashboard-supervisor-flags"] });
        }}
      />
    </div>
  );
}
