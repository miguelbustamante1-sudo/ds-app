/**
 * ImportantDatesPanel — Dashboard "Important Dates" panel
 * ========================================================
 *
 * Two views over the same data, switched from the header:
 *
 *   List     — upcoming holidays, time off, holiday swaps and birthdays (next 60 days),
 *              filterable and paginated. Tasks are deliberately NOT listed
 *              here: they live in the calendar view only, so a task isn't
 *              shown twice on the dashboard.
 *   Calendar — a compact month grid that stays inside this card's column so
 *              switching views never resizes or hides the neighbouring panel.
 *              A maximise button opens the same grid in a full-screen dialog
 *              with taller cells and full labels. Tasks DO appear here, so the
 *              supervisor can see what falls due and when.
 *
 * Both grids are built from one `buildCalEvents` map so they cannot drift.
 * Styling uses UDS TELUS semantic tokens only, matching FlagsPanel/TriviaPanel.
 *
 * Note: task chips in the calendar are informational only (no click-through
 * navigation) — resolving a pending task happens from wherever that task's
 * own feature page lives, not from this panel.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameMonth, isToday,
  format,
} from "date-fns";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Inbox,
  Maximize2,
  Sun,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatUTCDate, parseUTCDateAsLocal } from "@/lib/utils";
import { apiGet } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types + data
// ---------------------------------------------------------------------------

export interface ImportantDate {
  id: string;
  type: "TimeOff" | "HolidaySwap" | "Holiday" | "Birthday";
  date: string;
  endDate?: string;
  month: string;
  day: number;
  name?: string;
  workdayId?: string | null;
  categoryName?: string;
  holidayName?: string;
  countryCode?: string | null;
  recordId?: number;
}

/** Dashboard detail route for a clickable row's type, or null if the type has no detail page. */
function detailPath(ev: ImportantDate): string | null {
  if (ev.recordId === undefined) return null;
  if (ev.type === "TimeOff") return `/timeoff-detail/${ev.recordId}?from=/`;
  if (ev.type === "HolidaySwap") return `/holiday-swaps/${ev.recordId}?from=/`;
  return null;
}

export interface ActionItem {
  id: string;
  type: "TimeOff" | "HolidaySwap" | "Endorsement" | "StandaloneTask";
  title: string;
  source: string;
  ageLabel: string;
  dueDate: string;
  isOverdue: boolean;
}

function fetchImportantDates(): Promise<ImportantDate[]> {
  return apiGet<ImportantDate[]>("/api/dashboard/important-dates");
}

function fetchTasks(): Promise<ActionItem[]> {
  return apiGet<ActionItem[]>("/api/dashboard/tasks");
}

const PAGE_SIZE = 5;

type DateFilter = "All" | "Holiday" | "TimeOff" | "HolidaySwap" | "Birthday";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "All",         label: "All"           },
  { value: "Holiday",     label: "Holidays"      },
  { value: "TimeOff",     label: "Time Off"      },
  { value: "HolidaySwap", label: "Holiday Swaps" },
  { value: "Birthday",    label: "Birthdays"     },
];

function getDateIcon(type: ImportantDate["type"]) {
  switch (type) {
    case "TimeOff":
      return <Sun className="h-3.5 w-3.5 shrink-0 text-uds-system-blue-500" aria-hidden="true" />;
    case "HolidaySwap":
      return <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-uds-telus-purple-500" aria-hidden="true" />;
    case "Holiday":
      return <CalendarDays className="h-3.5 w-3.5 shrink-0 text-uds-system-amber-500" aria-hidden="true" />;
    case "Birthday":
      return <Gift className="h-3.5 w-3.5 shrink-0 text-uds-system-red-400" aria-hidden="true" />;
  }
}

/** Line 1 of a list row: "(WDID) Name" for people, holiday name for holidays. */
function primaryLabel(ev: ImportantDate): string {
  switch (ev.type) {
    case "TimeOff":
    case "HolidaySwap":
    case "Birthday":
      return ev.workdayId ? `(${ev.workdayId}) ${ev.name ?? ""}` : (ev.name ?? "");
    case "Holiday":
      return ev.holidayName ?? "";
  }
}

/** Line 2 of a list row — type-specific detail, all dates via formatUTCDate. */
function secondaryLabel(ev: ImportantDate): string {
  switch (ev.type) {
    case "TimeOff": {
      const range = ev.endDate
        ? `${formatUTCDate(ev.date)} – ${formatUTCDate(ev.endDate)}`
        : formatUTCDate(ev.date);
      return `${ev.categoryName ?? "Time Off"} | ${range}`;
    }
    case "HolidaySwap":
      return `${formatUTCDate(ev.date)} → ${formatUTCDate(ev.endDate ?? ev.date)}`;
    case "Holiday":
      return `${ev.countryCode ?? "—"} | ${formatUTCDate(ev.date)}`;
    case "Birthday":
      return formatUTCDate(ev.date);
  }
}

/** Fixed badge on the right of a list row, naming the item's type. */
function typeBadgeLabel(type: ImportantDate["type"]): string {
  switch (type) {
    case "TimeOff":
      return "Time Off";
    case "HolidaySwap":
      return "Holiday Swap";
    case "Holiday":
      return "Holiday";
    case "Birthday":
      return "Birthday";
  }
}

// ---------------------------------------------------------------------------
// Calendar model
// ---------------------------------------------------------------------------

type CalendarEventType = "timeoff" | "holidayswap" | "holiday" | "birthday" | "task";

interface CalDayEvent {
  id: string;
  title: string;   // plain label, used as the hover tooltip
  label: string;   // display text shown in the cell chip
  type: CalendarEventType;
  isOverdue?: boolean;
}

const CAL_EVENT_CLASSES: Record<CalendarEventType, string> = {
  timeoff:     "bg-uds-system-blue-100 text-uds-system-blue-700",
  holidayswap: "bg-uds-telus-purple-100 text-uds-telus-purple-700",
  holiday:     "bg-uds-system-amber-100 text-uds-system-amber-700",
  birthday:    "bg-uds-system-red-100 text-uds-system-red-700",
  task:        "bg-uds-telus-purple-200 text-uds-telus-purple-800",
};

const CAL_LEGEND: { type: CalendarEventType; label: string }[] = [
  { type: "timeoff",     label: "Time Off"      },
  { type: "holidayswap", label: "Holiday Swaps" },
  { type: "holiday",     label: "Holidays"      },
  { type: "birthday",    label: "Birthdays"     },
  { type: "task",        label: "Tasks"         },
];

const CAL_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Builds the day -> events map shared by the compact grid and the modal.
 * Holidays carry their country code and full name; birthdays and time off
 * use their description; tasks keep their title and overdue flag.
 */
function buildCalEvents(
  dates: ImportantDate[],
  tasks: ActionItem[],
): Map<string, CalDayEvent[]> {
  const map = new Map<string, CalDayEvent[]>();

  function add(key: string, ev: CalDayEvent) {
    const arr = map.get(key) ?? [];
    arr.push(ev);
    map.set(key, arr);
  }

  for (const d of dates) {
    const type: CalendarEventType =
      d.type === "Holiday" ? "holiday"
      : d.type === "Birthday" ? "birthday"
      : d.type === "HolidaySwap" ? "holidayswap"
      : "timeoff";

    let title: string;
    let label: string;
    if (type === "holiday") {
      title = d.holidayName ?? "Holiday";
      label = d.countryCode ? `${d.countryCode} · ${title}` : title;
    } else if (type === "birthday") {
      title = d.name ?? "Birthday";
      label = `🎂 ${title}`;
    } else if (type === "holidayswap") {
      title = d.name ?? "Holiday Swap";
      label = title;
    } else {
      title = d.name ?? "Time Off";
      label = title;
    }

    add(d.date.split("T")[0], { id: d.id, title, label, type });
  }

  for (const t of tasks) {
    if (!t.dueDate) continue;
    const parsed = parseUTCDateAsLocal(t.dueDate);
    add(format(parsed, "yyyy-MM-dd"), {
      id: t.id,
      title: t.title,
      label: t.title,
      type: "task",
      isOverdue: t.isOverdue,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Calendar grid — one component, two densities
// ---------------------------------------------------------------------------

interface CalendarGridProps {
  month: Date;
  eventsByDay: Map<string, CalDayEvent[]>;
  /** "compact" fits the dashboard column; "full" is the maximised dialog. */
  density: "compact" | "full";
}

function CalendarGrid({ month, eventsByDay, density }: CalendarGridProps) {
  const full = density === "full";
  const maxChips = full ? 4 : 2;

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(month),   { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <>
      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {CAL_WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className={cn(
              "pb-1 text-center font-semibold uppercase tracking-wide text-muted-foreground",
              full ? "text-xs" : "text-[10px]",
            )}
          >
            {full ? wd : wd.charAt(0)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        className={cn(
          "grid grid-cols-7 overflow-hidden rounded-md border-l border-t border-border",
          full && "flex-1 auto-rows-fr",
        )}
      >
        {gridDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const events = eventsByDay.get(key) ?? [];
          const visible = events.slice(0, maxChips);
          const overflow = events.length - maxChips;
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col border-r border-b border-border",
                full ? "min-h-[7rem] p-1.5" : "min-h-[4.5rem] p-1",
                !inMonth && "bg-muted/20",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex items-center justify-center rounded-full font-medium",
                  full ? "h-7 w-7 text-sm" : "h-5 w-5 text-[11px]",
                  today
                    ? "bg-primary text-primary-foreground"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40",
                )}
              >
                {format(day, "d")}
              </div>

              <div className={cn("overflow-hidden", full ? "space-y-1" : "space-y-0.5")}>
                {visible.map((ev) => (
                  <div
                    key={ev.id}
                    title={ev.label}
                    className={cn(
                      "flex gap-1 rounded-md font-medium leading-tight",
                      full ? "items-start px-1.5 py-1 text-xs" : "items-center truncate px-1 py-0.5 text-[9px]",
                      ev.type === "task" && ev.isOverdue
                        ? "bg-uds-system-red-100 text-uds-system-red-700"
                        : CAL_EVENT_CLASSES[ev.type],
                    )}
                  >
                    {ev.type === "task" && (
                      <Clock
                        className={cn("shrink-0", full ? "mt-0.5 h-3 w-3" : "h-2.5 w-2.5")}
                        aria-hidden="true"
                      />
                    )}
                    <span className={cn(full ? "line-clamp-2" : "truncate")}>{ev.label}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className={cn("text-muted-foreground", full ? "px-1.5 text-xs" : "px-1 text-[9px]")}>
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CalendarLegend({ dense }: { dense?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center", dense ? "mt-2 gap-3" : "mt-4 gap-5")}>
      {CAL_LEGEND.map(({ type, label }) => (
        <span
          key={type}
          className={cn(
            "flex items-center gap-1.5 text-muted-foreground",
            dense ? "text-[10px]" : "text-xs",
          )}
        >
          <span className={cn("inline-block rounded-sm", dense ? "h-2 w-2" : "h-3 w-3", CAL_EVENT_CLASSES[type])} />
          {label}
        </span>
      ))}
    </div>
  );
}

function MonthNav({
  month,
  onChange,
  size = "sm",
}: {
  month: Date;
  onChange: (next: Date) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(subMonths(month, 1))}
        aria-label="Previous month"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "text-center font-semibold text-foreground",
          size === "md" ? "min-w-[9rem] text-sm" : "min-w-[7.5rem] text-xs",
        )}
      >
        {format(month, "MMMM yyyy")}
      </span>
      <button
        type="button"
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Next month"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-screen calendar dialog
// ---------------------------------------------------------------------------

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
  onMonthChange: (next: Date) => void;
  eventsByDay: Map<string, CalDayEvent[]>;
}

function CalendarModal({ open, onOpenChange, month, onMonthChange, eventsByDay }: CalendarModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-uds-telus-purple-500" aria-hidden="true" />
            <DialogTitle className="text-base font-semibold text-foreground">
              Important Dates — Calendar
            </DialogTitle>
          </div>
          <div className="pr-8">
            <MonthNav month={month} onChange={onMonthChange} size="md" />
          </div>
        </div>
        <DialogDescription className="sr-only">
          Monthly calendar of upcoming holidays, birthdays, time off and tasks.
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col p-5">
          <CalendarGrid month={month} eventsByDay={eventsByDay} density="full" />
          <CalendarLegend />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ImportantDatesPanel() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<DateFilter>("All");
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));
  const [modalOpen, setModalOpen] = useState(false);

  const { data: dates = [], isLoading } = useQuery({
    queryKey: ["dashboard-important-dates"],
    queryFn: fetchImportantDates,
    staleTime: 5 * 60_000,
  });

  // Tasks feed the calendar only — the list intentionally excludes them.
  const { data: tasks = [] } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: fetchTasks,
    staleTime: 60_000,
  });

  const listEvents = useMemo(() => {
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    return activeFilter === "All" ? sorted : sorted.filter((d) => d.type === activeFilter);
  }, [dates, activeFilter]);

  const eventsByDay = useMemo(() => buildCalEvents(dates, tasks), [dates, tasks]);

  const totalPages = Math.max(1, Math.ceil(listEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = listEvents.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleFilterChange(value: DateFilter) {
    setActiveFilter(value);
    setPage(0);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      {/* Gradient header */}
      <div
        className="flex items-start justify-between gap-3 px-5 py-4 text-white"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Important Dates</span>
              {dates.length > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {dates.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-white/70">Holidays, time off, holiday swaps and birthdays</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-white/30">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors",
                view === "list" ? "bg-white/25 text-white" : "text-white/70 hover:bg-white/10",
              )}
            >
              <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              aria-pressed={view === "calendar"}
              className={cn(
                "flex items-center gap-1 border-l border-white/30 px-2.5 py-1 text-xs font-medium transition-colors",
                view === "calendar" ? "bg-white/25 text-white" : "text-white/70 hover:bg-white/10",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Calendar
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse important dates" : "Expand important dates"}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", !expanded && "-rotate-90")}
            />
          </button>
        </div>
      </div>

      {expanded && view === "calendar" && (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <MonthNav month={calMonth} onChange={setCalMonth} />
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Open calendar full screen"
              title="Open full screen"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          <CalendarGrid month={calMonth} eventsByDay={eventsByDay} density="full" />
          <CalendarLegend dense />
        </div>
      )}

      {expanded && view === "list" && (
        <>
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1 px-5 pt-3 pb-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFilterChange(f.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border px-5 py-2">
            {isLoading ? (
              <div className="space-y-3 py-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded bg-muted" />
                ))}
              </div>
            ) : listEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {activeFilter === "All"
                    ? "No upcoming events in the next 60 days."
                    : `No upcoming ${DATE_FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase()} in the next 60 days.`}
                </p>
              </div>
            ) : (
              visible.map((ev) => {
                const path = detailPath(ev);
                return (
                <div
                  key={ev.id}
                  onClick={path ? () => navigate(path) : undefined}
                  role={path ? "button" : undefined}
                  tabIndex={path ? 0 : undefined}
                  onKeyDown={path ? (e) => { if (e.key === "Enter") navigate(path); } : undefined}
                  className={cn(
                    "flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0",
                    path && "cursor-pointer rounded-md transition-colors hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {getDateIcon(ev.type)}
                      <span className="truncate text-sm font-medium text-foreground">
                        {primaryLabel(ev)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {secondaryLabel(ev)}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {typeBadgeLabel(ev.type)}
                  </span>
                </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {safePage * PAGE_SIZE + 1}–
                {Math.min((safePage + 1) * PAGE_SIZE, listEvents.length)} of {listEvents.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {safePage + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next page"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CalendarModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        month={calMonth}
        onMonthChange={setCalMonth}
        eventsByDay={eventsByDay}
      />
    </div>
  );
}
