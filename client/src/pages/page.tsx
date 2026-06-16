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
  Search,
  ChevronDown,
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
import { Calendar } from "@/components/ui/calendar";

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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          ⭐ Quick Access
        </p>
        {isFull && (
          <span className="text-[10px] text-white/40 ml-2 shrink-0">8 / 8 — unpin one to add another</span>
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
// Sub-component: ActionItemCard
// ---------------------------------------------------------------------------
function ActionItemCard({ item }: { item: ActionItem }) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-border last:border-b-0">
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
            OVERDUE {item.dueDate}
          </span>
        ) : (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Due {item.dueDate}
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
            tasks.map((item) => <ActionItemCard key={item.id} item={item} />)
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
// Sub-component: ImportantDatesCard (with Calendar view)
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

type ImportantDateFilter = "All" | "Holiday" | "TimeOff" | "Birthday";

const DATE_FILTERS: { value: ImportantDateFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Holiday", label: "Holidays" },
  { value: "TimeOff", label: "Time Off" },
  { value: "Birthday", label: "Birthdays" },
];

// UDS color classes for calendar day modifiers
const MODIFIER_CLASSES: Record<string, string> = {
  timeOff: "!bg-uds-system-blue-100 !text-uds-system-blue-700 rounded-md font-semibold",
  holiday: "!bg-uds-system-amber-100 !text-uds-system-amber-700 rounded-md font-semibold",
  birthday: "!bg-uds-system-red-100 !text-uds-system-red-700 rounded-md font-semibold",
};

function ImportantDatesCard() {
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ImportantDateFilter>("All");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const { data: dates = [], isLoading } = useQuery({
    queryKey: ["dashboard-important-dates"],
    queryFn: fetchImportantDates,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(
    () => activeFilter === "All" ? dates : dates.filter((d) => d.type === activeFilter),
    [dates, activeFilter],
  );

  // Calendar day modifiers — built from the filtered list so pills drive both calendar and list
  const modifiers = useMemo(() => {
    const timeOff: Date[] = [];
    const holiday: Date[] = [];
    const birthday: Date[] = [];
    for (const d of filtered) {
      const parsed = parseUTCDateAsLocal(d.date);
      if (d.type === "TimeOff") timeOff.push(parsed);
      else if (d.type === "Holiday") holiday.push(parsed);
      else birthday.push(parsed);
    }
    return { timeOff, holiday, birthday };
  }, [filtered]);

  // List filtered by the clicked day (if any)
  const listItems = useMemo(() => {
    if (!selectedDay) return filtered;
    const sel = selectedDay.toISOString().split("T")[0];
    return filtered.filter((d) => d.date.split("T")[0] === sel);
  }, [filtered, selectedDay]);

  const visible = showAll ? listItems : listItems.slice(0, 6);

  function handleFilterChange(value: ImportantDateFilter) {
    setActiveFilter(value);
    setShowAll(false);
    setSelectedDay(undefined);
  }

  function handleDayClick(day: Date) {
    const isSame =
      selectedDay &&
      selectedDay.getFullYear() === day.getFullYear() &&
      selectedDay.getMonth() === day.getMonth() &&
      selectedDay.getDate() === day.getDate();
    setSelectedDay(isSame ? undefined : day);
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
            onClick={() => setView('calendar')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors",
              view === 'calendar' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => { setView('list'); setSelectedDay(undefined); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors border-l border-border",
              view === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            List
          </button>
        </div>
      </div>

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

      {/* Calendar + Legend (calendar view only) */}
      {view === 'calendar' && (
        <>
          <div className="pb-2">
            <Calendar
              mode="single"
              selected={selectedDay}
              onDayClick={handleDayClick}
              modifiers={modifiers}
              modifiersClassNames={MODIFIER_CLASSES}
              classNames={{
                caption_label: 'text-base font-semibold',
                month_caption: 'relative mx-10 mb-2 flex h-9 items-center justify-center z-20',
                day: 'group size-10 px-0 py-px text-sm',
                weekday: 'size-10 p-0 text-xs font-medium text-muted-foreground/80',
              }}
            />
          </div>
          {selectedDay && listItems.length > 0 ? (
            <div className="px-5 pb-3 border-t border-border">
              <div className="flex items-center justify-between pt-2 pb-1">
                <span className="text-xs font-semibold text-foreground">
                  {formatUTCDate(selectedDay.toISOString())}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDay(undefined)}
                  className="text-[10px] text-uds-telus-purple-500 hover:underline"
                >
                  Clear
                </button>
              </div>
              {listItems.map((date) => (
                <div
                  key={date.id}
                  className="flex items-start gap-2 py-2 border-b border-border last:border-b-0"
                >
                  <span className="mt-0.5 shrink-0">{getDateIcon(date.type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{date.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{date.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 pb-3 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-uds-system-blue-200" />
                Time Off
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-uds-system-amber-200" />
                Holidays
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-uds-system-red-200" />
                Birthdays
              </span>
            </div>
          )}
        </>
      )}

      {/* Date list (list view only) */}
      {view === 'list' && (
        <>
          <div className="px-5 py-2 border-t border-border">
            {isLoading ? (
              <div className="py-4 space-y-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded bg-muted" />
                ))}
              </div>
            ) : listItems.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {activeFilter === "All"
                    ? "No upcoming events in the next 60 days."
                    : `No upcoming ${DATE_FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase()} in the next 60 days.`}
                </p>
              </div>
            ) : (
              visible.map((date) => (
                <div
                  key={date.id}
                  className="flex items-start gap-3 py-3 border-b border-border last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getDateIcon(date.type)}
                      <button
                        type="button"
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                      >
                        {date.title}
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                      {date.type === "Holiday" && date.countryCode && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-uds-system-blue-50 text-uds-system-blue-700 border border-uds-system-blue-200">
                          {date.countryCode}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {date.description}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/70 tracking-wide">
                      {formatUTCDate(date.date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {listItems.length > 6 && (
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
                {showAll ? "View Less" : `View More (${listItems.length - 6} more)`}
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
          <AwaitingActionPanel />
          <ImportantDatesCard />
        </div>
      )}
    </div>
  );
}
