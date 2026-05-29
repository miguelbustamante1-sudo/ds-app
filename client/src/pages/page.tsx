/**
 * Layout1Page — Global Dashboard (Workday-style)
 * ================================================
 *
 * Root landing page ("/"). Redesigned as a Workday-style dashboard.
 *
 * Sections (top → bottom):
 *   1. Hero: personalised greeting + GlobalSearchBar + FavoriteCards
 *   2. Two-column grid [content | 320px sidebar]:
 *      Left:  NotificationCenterPanel → AwaitingActionPanel
 *      Right: ImportantDatesCard
 *
 * Phase 2: All panels connected to real API via TanStack Query.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Bell,
  BellOff,
  Archive,
  Star,
  Layers,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/auth-provider";
import { useFavorites } from "@/contexts/favorites-context";
import { NotificationItem } from "@/components/layouts/shared/topbar/notifications/item-mapper";
import { NotificationDTO } from "@shared/dto";
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
// API types (mirror backend DTOs)
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

async function fetchNotifications(
  status: "unread" | "read" | "archived",
): Promise<NotificationDTO[]> {
  return apiFetch<NotificationDTO[]>(`/api/notifications?status=${status}`);
}

async function markAllRead(): Promise<void> {
  await apiFetch<unknown>("/api/notifications/read-all", { method: "PATCH" });
}

async function archiveAll(): Promise<void> {
  await apiFetch<unknown>("/api/notifications/archive-all", { method: "PATCH" });
}

async function markOneRead(recipientId: number): Promise<void> {
  await apiFetch<unknown>(`/api/notifications/${recipientId}/read`, { method: "PATCH" });
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
// Sub-component: GlobalSearchBar
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
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
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
              {filteredServices.map((s) => (
                <button
                  key={s.path}
                  type="button"
                  role="option"
                  onClick={() => handleSelect(s.path)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left",
                    "hover:bg-accent/60 transition-colors duration-100",
                    "border-b border-border last:border-b-0",
                  )}
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
              ))}
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
// Sub-component: FavoriteCards
// ---------------------------------------------------------------------------
function FavoriteCards() {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFull, isLoading } = useFavorites();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[52px] rounded-xl border border-border bg-card animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        ⭐ Pin shortcuts from any Hub card to see them here.
      </p>
    );
  }

  return (
    <>
      {isFull && (
        <p className="text-xs text-muted-foreground text-right mb-1">
          8 / 8 quick links — unpin one to add another
        </p>
      )}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
      {favorites.map((fav) => (
        <div key={fav.id} className="group relative">
          <button
            type="button"
            onClick={() => navigate(fav.path)}
            aria-label={`Go to ${fav.label}`}
            className={cn(
              "w-full rounded-xl border border-border bg-card shadow-xs",
              "px-4 py-3",
              "text-sm font-medium text-foreground text-left",
              "hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "pr-8",
            )}
          >
            {fav.label}
          </button>
          <button
            type="button"
            title={`Unpin ${fav.label}`}
            onClick={() => toggleFavorite(fav)}
            aria-label={`Unpin ${fav.label} from Quick Links`}
            className={cn(
              "absolute right-2.5 top-1/2 -translate-y-1/2",
              "text-uds-system-amber-400 hover:text-uds-system-amber-500",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              "focus-visible:opacity-100 focus-visible:outline-none",
              "p-0.5 rounded",
            )}
          >
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: NotificationCenterPanel
// ---------------------------------------------------------------------------
type NotifTab = "unread" | "read" | "archived";

function NotificationCenterPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<NotifTab>("unread");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", tab],
    queryFn: () => fetchNotifications(tab),
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: markOneRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const tabItems: { key: NotifTab; label: string }[] = [
    { key: "unread", label: "Unread" },
    { key: "read", label: "Read" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      {/* Panel header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Bell
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-foreground">
              Notification Center
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/notification-center")}
            className="text-xs text-muted-foreground hover:text-uds-telus-purple-500 transition-colors"
          >
            View all →
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Review and manage all your notifications
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {tabItems.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 pt-1 mr-5 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "border-uds-telus-purple-500 text-uds-telus-purple-500"
                : "border-transparent text-muted-foreground hover:text-uds-telus-purple-400",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => markReadMutation.mutate()}
          disabled={markReadMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2.5 py-1 disabled:opacity-50"
        >
          <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
          Mark all as read
        </button>
        <button
          type="button"
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2.5 py-1 disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          Archive all
        </button>
      </div>

      {/* Notification list / empty state */}
      <div className="px-5 py-6 min-h-[140px] flex items-center justify-center">
        {isLoading ? (
          <div className="w-full space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <Bell
              className="h-8 w-8 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {tab === "unread"
                ? "No unread notifications"
                : tab === "read"
                  ? "No read notifications"
                  : "No archived notifications"}
            </p>
          </div>
        ) : (
          <ul className="w-full divide-y divide-border -mx-5">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  onMarkAsRead={(id) => markOneMutation.mutate(id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
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
        <FolderOpen
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
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
          aria-label={
            expanded ? "Collapse action items" : "Expand action items"
          }
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
// Sub-component: ImportantDatesCard
// ---------------------------------------------------------------------------
function getDateIcon(type: ImportantDate["type"]) {
  switch (type) {
    case "TimeOff":
      return <Sun className="h-3.5 w-3.5 text-uds-system-blue-500" aria-hidden="true" />;
    case "Holiday":
      return (
        <CalendarDays
          className="h-3.5 w-3.5 text-uds-system-amber-500"
          aria-hidden="true"
        />
      );
    case "Birthday":
      return <Gift className="h-3.5 w-3.5 text-uds-system-red-400" aria-hidden="true" />;
  }
}

function ImportantDatesCard() {
  const [showAll, setShowAll] = useState(false);

  const { data: dates = [], isLoading } = useQuery({
    queryKey: ["dashboard-important-dates"],
    queryFn: fetchImportantDates,
    staleTime: 5 * 60_000,
  });

  const visible = showAll ? dates : dates.slice(0, 6);

  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <CalendarDays
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-foreground">
          Important Dates
        </span>
      </div>

      <div className="px-5 py-2">
        {isLoading ? (
          <div className="py-4 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted" />
            ))}
          </div>
        ) : dates.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No upcoming events in the next 60 days.
            </p>
          </div>
        ) : (
          visible.map((date) => (
            <div
              key={date.id}
              className="flex items-start gap-4 py-3 border-b border-border last:border-b-0"
            >
              <div className="flex shrink-0 flex-col items-center w-10 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {date.month}
                </span>
                <span className="text-xl font-bold text-foreground leading-tight">
                  {date.day}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {getDateIcon(date.type)}
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    {date.title}
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  {date.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {dates.length > 6 && (
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
            {showAll ? "View Less" : `View More (${dates.length - 6} more)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component: Layout1Page
// ---------------------------------------------------------------------------
export function Layout1Page() {
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="container pb-10">
      {/* ── Hero Header ── */}
      <section
        className="flex flex-col items-center gap-6 py-10 text-center rounded-2xl mb-4 px-6 shadow-[var(--shadow-uds-card-elevated)]"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-uds-telus-purple-100">
            Here's what needs your attention today.
          </p>
        </div>

        <GlobalSearchBar />
      </section>

      {/* ── Quick Links ── */}
      <div className="mb-6 mt-4">
        <FavoriteCards />
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Awaiting Action only — spans 3 of 4 columns */}
        <div className="lg:col-span-3">
          <AwaitingActionPanel />
        </div>

        {/* Right sidebar: Notification Center + Important Dates — spans 1 column */}
        <aside className="flex flex-col gap-6">
          <NotificationCenterPanel />
          <ImportantDatesCard />
        </aside>
      </div>
    </div>
  );
}
