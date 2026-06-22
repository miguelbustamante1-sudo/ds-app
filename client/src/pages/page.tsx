/**
 * Layout1Page — Global Dashboard
 * ================================
 *
 * Sections (top → bottom):
 *   1. Hero (Variant B — Split): greeting + GlobalSearchBar (left) | Quick Access favorites (right)
 *   2. Two-column grid [Awaiting Action | Important Dates+Calendar] (team-access users only)
 *
 * Notifications live entirely in the topbar bell slider.
 */

import { useState, useEffect, useRef, useMemo } from "react";
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
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Inbox,
  Gift,
  Sun,
  Clock,
  AlertCircle,
  MoreHorizontal,
  FolderOpen,
  Star,
  Layers,
  User,
} from "lucide-react";
import { cn, formatUTCDate, parseUTCDateAsLocal } from "@/lib/utils";
import { useAuth } from "@/auth/auth-provider";
import { useFavorites } from "@/contexts/favorites-context";
import type { TeamMemberDTO } from "@shared/dto";
import { usePermissions } from "@/hooks/usePermissions";
import { MENU_SIDEBAR } from "@/config/layout-1.config";
import { communicationsHubConfig } from "@/config/hubs/communications.hub.config";
import { selfServiceHubConfig } from "@/config/hubs/self-service.hub.config";
import { hiringHubConfig } from "@/config/hubs/hiring.hub.config";
import { projectManagementHubConfig } from "@/config/hubs/project-management.hub.config";
import { timeOffHubConfig } from "@/config/hubs/time-off.hub.config";
import { reportsHubConfig } from "@/config/hubs/reports.hub.config";
import { governanceHubConfig } from "@/config/hubs/governance.hub.config";
import { securityHubConfig } from "@/config/hubs/security.hub.config";
import { maintenanceHubConfig } from "@/config/hubs/maintenance.hub.config";
import { operationsHubConfig } from "@/config/hubs/operations.hub.config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  type: "TimeOff" | "HolidaySwap" | "MissingSupervisor" | "Endorsement";
  title: string;
  source: string;
  ageLabel: string;
  dueDate: string;
  isOverdue: boolean;
}

interface ImportantDate {
  id: string;
  type: "TimeOff" | "Holiday" | "Birthday";
  date: string;
  month: string;
  day: number;
  title: string;
  description: string;
  countryCode?: string | null;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function fetchTasks(): Promise<ActionItem[]> {
  return apiFetch<ActionItem[]>("/api/dashboard/tasks");
}

async function fetchImportantDates(): Promise<ImportantDate[]> {
  return apiFetch<ImportantDate[]>("/api/dashboard/important-dates");
}

// ---------------------------------------------------------------------------
// Search helpers — build searchable catalog from sidebar + all hub configs
// ---------------------------------------------------------------------------

interface SearchableService {
  title: string;
  description?: string;
  path: string;
  permission?: string;
  role?: string | string[];
}

function getAllSearchableServices(): SearchableService[] {
  const sidebarItems: SearchableService[] = MENU_SIDEBAR
    .filter((item) => item.path && item.title)
    .map((item) => ({
      title: item.title!,
      path: item.path!,
      permission: item.permission,
      role: item.role,
      description: "Hub",
    }));

  const hubConfigs = [
    communicationsHubConfig,
    selfServiceHubConfig,
    hiringHubConfig,
    projectManagementHubConfig,
    timeOffHubConfig,
    reportsHubConfig,
    governanceHubConfig,
    securityHubConfig,
    maintenanceHubConfig,
    operationsHubConfig,
  ];

  const seen = new Set<string>(sidebarItems.map((i) => i.path));
  const hubItems: SearchableService[] = [];

  for (const config of hubConfigs) {
    const buttons = [
      ...(config.buttons ?? []),
      ...(config.sections?.flatMap((s) => s.buttons) ?? []),
    ];
    for (const btn of buttons) {
      if (!seen.has(btn.path)) {
        seen.add(btn.path);
        hubItems.push({
          title: btn.title,
          description: btn.description,
          path: btn.path,
          permission: btn.permission,
          role: btn.role,
        });
      }
    }
  }

  return [...sidebarItems, ...hubItems];
}

// ---------------------------------------------------------------------------
// Sub-component: GlobalSearchBar (with favorite star on Services)
// ---------------------------------------------------------------------------
function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canRead } = usePermissions();
  const { toggleFavorite, isFavorite, isFull } = useFavorites();

  const allServices = useMemo(getAllSearchableServices, []);

  function hasRole(role: string | string[] | undefined): boolean {
    if (!role) return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => user?.roles?.includes(r) ?? false);
  }

  const q = query.toLowerCase().trim();
  const filteredServices = q.length === 0
    ? []
    : allServices
        .filter((s) => {
          if (!hasRole(s.role)) return false;
          if (s.permission && !canRead(s.permission)) return false;
          return (
            s.title.toLowerCase().includes(q) ||
            (s.description !== "Hub" && (s.description ?? "").toLowerCase().includes(q))
          );
        })
        .slice(0, 6);

  // Debounced team member fetch
  useEffect(() => {
    if (query.length < 2) {
      setTeamMembers([]);
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    const timer = setTimeout(async () => {
      try {
        const all = await apiFetch<TeamMemberDTO[]>("/api/team-members");
        const qLower = query.toLowerCase();
        setTeamMembers(
          all
            .filter(
              (m) =>
                `${m.teamMemberNames} ${m.teamMemberSurnames}`
                  .toLowerCase()
                  .includes(qLower) ||
                (m.teamMemberKnownAs ?? "").toLowerCase().includes(qLower),
            )
            .slice(0, 5),
        );
      } catch {
        setTeamMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const hasAnyResults =
    filteredServices.length > 0 || loadingMembers || teamMembers.length > 0;
  const showDropdown = open && query.trim().length > 0 && hasAnyResults;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      navigate(`/reports?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelect(path: string) {
    setOpen(false);
    setQuery("");
    navigate(path);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-uds-telus-purple-300 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search for anything…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            aria-label="Global search"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            className={cn(
              "w-full rounded-full border border-uds-telus-purple-200 bg-white py-3 pl-12 pr-5",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "shadow-sm focus:outline-none focus:ring-2 focus:ring-uds-telus-purple-400/50 focus:border-uds-telus-purple-400",
              "transition-shadow duration-150",
            )}
          />
        </div>
      </form>

      {showDropdown && (
        <div
          role="listbox"
          className={cn(
            "absolute top-full mt-2 w-full bg-white rounded-xl border border-border",
            "shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto",
          )}
        >
          {filteredServices.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/40 border-b border-border">
                Services
              </div>
              {filteredServices.map((s) => {
                const pinned = isFavorite(s.path);
                const canPin = pinned || !isFull;
                return (
                  <div
                    key={s.path}
                    className={cn(
                      "flex items-center gap-0 border-b border-border last:border-b-0",
                      "hover:bg-accent/60 transition-colors duration-100",
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      onClick={() => handleSelect(s.path)}
                      className="flex-1 flex items-start gap-3 px-4 py-3 text-left min-w-0"
                    >
                      <Layers
                        className="mt-0.5 h-4 w-4 shrink-0 text-uds-telus-purple-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {s.title}
                        </p>
                        {s.description && s.description !== "Hub" && (
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={!canPin}
                      aria-pressed={pinned}
                      aria-label={pinned ? `Unpin ${s.title}` : `Pin ${s.title} to Quick Access`}
                      title={
                        pinned
                          ? `Unpin ${s.title}`
                          : isFull
                            ? "Quick Access is full (8/8)"
                            : `Pin ${s.title} to Quick Access`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite({ id: s.path, label: s.title, path: s.path });
                      }}
                      className={cn(
                        "shrink-0 p-2.5 mr-1 rounded-md transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        pinned
                          ? "text-uds-system-amber-400 hover:text-uds-system-amber-500"
                          : "text-muted-foreground/40 hover:text-uds-system-amber-400",
                        !canPin && "opacity-30 cursor-not-allowed",
                      )}
                    >
                      <Star
                        className={cn("h-4 w-4", pinned && "fill-current")}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {(loadingMembers || teamMembers.length > 0) && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/40 border-b border-border">
                People
              </div>
              {loadingMembers ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Searching…
                </div>
              ) : (
                teamMembers.map((m) => (
                  <button
                    key={m.teamMemberId}
                    type="button"
                    role="option"
                    onClick={() => handleSelect(`/my-team/${m.teamMemberId}`)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left",
                      "hover:bg-accent/60 transition-colors duration-100",
                      "border-b border-border last:border-b-0",
                    )}
                  >
                    <User
                      className="mt-0.5 h-4 w-4 shrink-0 text-uds-telus-green-500"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {m.teamMemberNames} {m.teamMemberSurnames}
                      </p>
                      {m.roleName && (
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                          {m.roleName}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: QuickAccessPanel (favorites, right side of split hero)
// ---------------------------------------------------------------------------
function QuickAccessPanel() {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFull, isLoading } = useFavorites();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 bg-white/10 border border-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
          ⭐ Quick Access
        </p>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-7 rounded bg-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 bg-white/10 border border-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          ⭐ Quick Access
        </p>
        {isFull && (
          <span className="text-[10px] text-white/40 shrink-0">Favorites full — unpin one to add another</span>
        )}
      </div>

      {favorites.length === 0 ? (
        <p className="text-xs text-white/50 py-2 text-center">
          Pin shortcuts from any Hub card to see them here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
            {favorites.map((fav) => (
              <div key={fav.id} className="group relative">
                <button
                  type="button"
                  onClick={() => navigate(fav.path)}
                  aria-label={`Go to ${fav.label}`}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 pr-6",
                    "text-sm font-medium text-white/90 text-left leading-snug",
                    "hover:bg-white/15 transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  )}
                >
                  {fav.label}
                </button>
                <button
                  type="button"
                  title={`Unpin ${fav.label}`}
                  onClick={() => toggleFavorite(fav)}
                  aria-label={`Unpin ${fav.label} from Quick Access`}
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2",
                    "text-uds-system-amber-400 hover:text-uds-system-amber-300",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    "focus-visible:opacity-100 focus-visible:outline-none",
                    "p-0.5 rounded",
                  )}
                >
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
function resolveTaskPath(item: ActionItem): string {
  const numericId = item.id.replace(/^[a-z]+-/, '');
  switch (item.type) {
    case 'TimeOff':        return `/timeoff-detail/${numericId}`;
    case 'HolidaySwap':   return `/holiday-swaps/${numericId}`;
    case 'Endorsement':   return `/endorsements/${numericId}`;
    case 'MissingSupervisor': return '/maintenance/supervisor-assignments';
  }
}

// Sub-component: ActionItemCard
// ---------------------------------------------------------------------------
function ActionItemCard({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  return (
    <div
      className="flex items-start gap-3 py-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 -mx-5 px-5 transition-colors"
      onClick={onClick}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.source} — {item.ageLabel}
        </p>
        {item.isOverdue ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            OVERDUE {item.dueDate ? formatUTCDate(item.dueDate) : ''}
          </span>
        ) : (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Due {item.dueDate ? formatUTCDate(item.dueDate) : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: AwaitingActionPanel
// ---------------------------------------------------------------------------
function AwaitingActionPanel() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: fetchTasks,
    staleTime: 60_000,
  });

  const overdueCount = tasks.filter((i) => i.isOverdue).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">
            Awaiting Your Action
          </span>
          {overdueCount > 0 && (
            <span className="ml-1 rounded-full bg-uds-system-red-200 px-2 py-0.5 text-xs font-medium text-uds-system-red-700">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse action items" : "Expand action items"}
          className="text-muted-foreground hover:text-foreground transition-colors"
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
        <div className="px-5">
          {isLoading ? (
            <div className="py-4 space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded bg-muted" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No pending actions — you're all caught up!
              </p>
            </div>
          ) : (
            tasks.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onClick={() => navigate(resolveTaskPath(item))}
              />
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <button
          type="button"
          onClick={() => navigate("/my-team/pending")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
          Go to My Tasks ({tasks.length})
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: DashboardCalendarView — Google Calendar-style monthly grid
// Replaces both AwaitingActionPanel and ImportantDatesCard when Calendar mode
// is active at the Layout1Page level.
// ---------------------------------------------------------------------------

type CalendarEventType = 'timeoff' | 'holiday' | 'birthday' | 'task';

interface CalDayEvent {
  id: string;
  title: string;
  type: CalendarEventType;
}

const CAL_EVENT_CLASSES: Record<CalendarEventType, string> = {
  timeoff:  'bg-uds-system-blue-100 text-uds-system-blue-700',
  holiday:  'bg-uds-system-amber-100 text-uds-system-amber-700',
  birthday: 'bg-uds-system-red-100 text-uds-system-red-700',
  task:     'bg-uds-telus-purple-100 text-uds-telus-purple-700',
};

const CAL_LEGEND: { type: CalendarEventType; label: string }[] = [
  { type: 'timeoff',  label: 'Time Off' },
  { type: 'holiday',  label: 'Holidays' },
  { type: 'birthday', label: 'Birthdays' },
  { type: 'task',     label: 'Tasks' },
];

const CAL_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


function DashboardCalendarView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const { data: tasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: fetchTasks,
    staleTime: 60_000,
  });

  const { data: dates = [] } = useQuery({
    queryKey: ['dashboard-important-dates'],
    queryFn: fetchImportantDates,
    staleTime: 5 * 60_000,
  });

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(month),   { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalDayEvent[]>();

    function add(key: string, ev: CalDayEvent) {
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }

    for (const d of dates) {
      const type: CalendarEventType =
        d.type === 'Holiday' ? 'holiday' : d.type === 'Birthday' ? 'birthday' : 'timeoff';
      add(d.date.split('T')[0], { id: d.id, title: d.title, type });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      const parsed = parseUTCDateAsLocal(t.dueDate);
      add(format(parsed, 'yyyy-MM-dd'), { id: t.id, title: t.title, type: 'task' });
    }

    return map;
  }, [dates, tasks]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)]">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => setMonth(m => subMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(month, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {CAL_WEEKDAYS.map(wd => (
            <div key={wd} className="py-1 text-center text-xs font-medium text-muted-foreground">
              {wd}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 border-l border-t border-border">
          {gridDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const events = eventsByDay.get(key) ?? [];
            const visibleEvents = events.slice(0, 3);
            const overflow = events.length - 3;
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  'min-h-[5.5rem] border-r border-b border-border p-1',
                  !inMonth && 'bg-muted/20',
                )}
              >
                <div className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  today
                    ? 'bg-primary text-primary-foreground'
                    : inMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/40',
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {visibleEvents.map(ev => (
                    <div
                      key={ev.id}
                      title={ev.title}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight',
                        CAL_EVENT_CLASSES[ev.type],
                      )}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="px-1 text-[10px] text-muted-foreground">
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {CAL_LEGEND.map(({ type, label }) => (
            <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', CAL_EVENT_CLASSES[type])} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ImportantDatesCard (list view only — calendar handled globally)
// ---------------------------------------------------------------------------
function getDateIcon(type: ImportantDate["type"]) {
  switch (type) {
    case "TimeOff":
      return <Sun className="h-3.5 w-3.5 text-uds-system-blue-500" aria-hidden="true" />;
    case "Holiday":
      return <CalendarDays className="h-3.5 w-3.5 text-uds-system-amber-500" aria-hidden="true" />;
    case "Birthday":
      return <Gift className="h-3.5 w-3.5 text-uds-system-red-400" aria-hidden="true" />;
  }
}

type ImportantDateFilter = "All" | "Holiday" | "TimeOff" | "Birthday" | "Task";

const DATE_FILTERS: { value: ImportantDateFilter; label: string }[] = [
  { value: "All",      label: "All"       },
  { value: "Holiday",  label: "Holidays"  },
  { value: "TimeOff",  label: "Time Off"  },
  { value: "Birthday", label: "Birthdays" },
  { value: "Task",     label: "Tasks"     },
];

// Unified shape for the list — covers both ImportantDate and ActionItem
interface ListEvent {
  id: string;
  kind: 'date' | 'task';
  type: ImportantDate['type'] | 'Task';
  date: string;
  title: string;
  description: string;
  countryCode?: string | null;
  isOverdue?: boolean;
}

function getListEventIcon(ev: ListEvent) {
  if (ev.kind === 'task') {
    return ev.isOverdue
      ? <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden="true" />
      : <Clock className="h-3.5 w-3.5 text-uds-telus-purple-500 shrink-0" aria-hidden="true" />;
  }
  return getDateIcon(ev.type as ImportantDate['type']);
}

interface ImportantDatesCardProps {
  view: 'list' | 'calendar';
  onViewChange: (v: 'list' | 'calendar') => void;
}

function ImportantDatesCard({ view, onViewChange }: ImportantDatesCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ImportantDateFilter>("All");
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));

  const { data: dates = [], isLoading } = useQuery({
    queryKey: ["dashboard-important-dates"],
    queryFn: fetchImportantDates,
    staleTime: 5 * 60_000,
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: fetchTasks,
    staleTime: 60_000,
  });

  // Unified sorted list for list view
  const allEvents = useMemo<ListEvent[]>(() => {
    const dateItems: ListEvent[] = dates.map((d) => ({
      id: d.id, kind: 'date', type: d.type,
      date: d.date, title: d.title, description: d.description, countryCode: d.countryCode,
    }));
    const taskItems: ListEvent[] = tasks
      .filter((t) => !!t.dueDate)
      .map((t) => ({
        id: t.id, kind: 'task', type: 'Task' as const,
        date: t.dueDate, title: t.title, description: t.source, isOverdue: t.isOverdue,
      }));

    const combined = [...dateItems, ...taskItems].sort((a, b) => a.date.localeCompare(b.date));

    if (activeFilter === 'All')  return combined;
    if (activeFilter === 'Task') return taskItems;
    return dateItems.filter((e) => e.type === activeFilter);
  }, [dates, tasks, activeFilter]);

  const visible = showAll ? allEvents : allEvents.slice(0, 6);

  // Calendar grid days
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(calMonth),   { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  // Calendar event map — important dates + tasks
  const calEventsByDay = useMemo(() => {
    const map = new Map<string, CalDayEvent[]>();

    function add(key: string, ev: CalDayEvent) {
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }

    for (const d of dates) {
      const type: CalendarEventType =
        d.type === 'Holiday' ? 'holiday' : d.type === 'Birthday' ? 'birthday' : 'timeoff';
      add(d.date.split('T')[0], { id: d.id, title: d.title, type });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      const parsed = parseUTCDateAsLocal(t.dueDate);
      add(format(parsed, 'yyyy-MM-dd'), { id: t.id, title: t.title, type: 'task' });
    }

    return map;
  }, [dates, tasks]);

  function handleFilterChange(value: ImportantDateFilter) {
    setActiveFilter(value);
    setShowAll(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Important Dates</span>
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors",
              view === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            List
          </button>
          <button
            type="button"
            onClick={() => onViewChange('calendar')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors border-l border-border",
              view === 'calendar' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Calendar
          </button>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {view === 'calendar' && (
        <div className="p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setCalMonth(m => subMonths(m, 1))}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(calMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setCalMonth(m => addMonths(m, 1))}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {CAL_WEEKDAYS.map(wd => (
              <div key={wd} className="py-1 text-center text-xs font-medium text-muted-foreground">
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t border-border">
            {gridDays.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const events = calEventsByDay.get(key) ?? [];
              const visibleEvents = events.slice(0, 2);
              const overflow = events.length - 2;
              const inMonth = isSameMonth(day, calMonth);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[4.5rem] border-r border-b border-border p-0.5',
                    !inMonth && 'bg-muted/20',
                  )}
                >
                  <div className={cn(
                    'mb-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium',
                    today
                      ? 'bg-primary text-primary-foreground'
                      : inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {visibleEvents.map(ev => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        className={cn(
                          'truncate rounded px-0.5 py-0.5 text-[9px] font-medium leading-tight',
                          CAL_EVENT_CLASSES[ev.type],
                        )}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="px-0.5 text-[9px] text-muted-foreground">+{overflow}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend — all 4 categories */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {CAL_LEGEND.map(({ type, label }) => (
              <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn('inline-block h-2 w-2 rounded-sm', CAL_EVENT_CLASSES[type])} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <>
          {/* Filter pills */}
          <div className="flex items-center gap-1 px-5 pt-3 pb-1 flex-wrap">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFilterChange(f.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  activeFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Unified event list */}
          <div className="px-5 py-2 border-t border-border">
            {(isLoading || isLoadingTasks) ? (
              <div className="py-4 space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded bg-muted" />
                ))}
              </div>
            ) : allEvents.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {activeFilter === "All"
                    ? "No upcoming events in the next 60 days."
                    : `No upcoming ${DATE_FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase()} in the next 60 days.`}
                </p>
              </div>
            ) : (
              visible.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-b-0"
                >
                  {/* Left: icon + title + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getListEventIcon(ev)}
                      <span className="text-sm font-medium text-foreground truncate">
                        {ev.title}
                      </span>
                      {ev.isOverdue && (
                        <span className="shrink-0 text-[10px] font-semibold text-destructive">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {ev.description}
                    </p>
                  </div>

                  {/* Right: country badge + date */}
                  <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                    {ev.countryCode && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-uds-system-blue-50 text-uds-system-blue-700 border border-uds-system-blue-200">
                        {ev.countryCode}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {ev.date ? formatUTCDate(ev.date) : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {allEvents.length > 6 && (
            <div className="px-5 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    showAll && "rotate-180",
                  )}
                />
                {showAll ? "View Less" : `View More (${allEvents.length - 6} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component: Layout1Page
// ---------------------------------------------------------------------------
export function Layout1Page() {
  const { user } = useAuth();
  const { canRead } = usePermissions();
  const [calView, setCalView] = useState<'list' | 'calendar'>('list');

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hasTeamAccess = canRead('TeamMembers');

  return (
    <div className="container pb-10">
      {/* ── Hero: Variant B — Split panel ── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-8 rounded-2xl mb-6 px-6 shadow-[var(--shadow-uds-card-elevated)] text-white"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        {/* Left — greeting + search */}
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="mt-1 text-sm text-uds-telus-purple-100">
              Here's what needs your attention today.
            </p>
          </div>
          <div className="w-full max-w-md">
            <GlobalSearchBar />
          </div>
        </div>

        {/* Right — Quick Access */}
        <QuickAccessPanel />
      </section>

      {/* ── Main Content (team-access users only) ── */}
      {hasTeamAccess && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {calView === 'list' && <AwaitingActionPanel />}
          <div className={cn(calView === 'calendar' && 'lg:col-span-2')}>
            <ImportantDatesCard view={calView} onViewChange={setCalView} />
          </div>
        </div>
      )}
    </div>
  );
}
