/**
 * Layout1Page — Global Dashboard
 * ================================
 *
 * Sections (top → bottom):
 *   1. Hero (Variant B — Split): greeting + GlobalSearchBar (left) | Quick Access favorites (right)
 *   2. Team-access users: two-column [Weekly Flags | My To-Do], then Important Dates
 *      full-width, then Trivia full-width.
 *      Users without team access: two-column [Trivia | My To-Do] (unchanged).
 *
 * Notifications live entirely in the topbar bell slider.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Layers, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { TriviaPanel } from "./components/TriviaPanel";
import { TodoPanel } from "./components/TodoPanel";
import { FlagsPanel } from "./components/FlagsPanel";
import { ImportantDatesPanel } from "./components/ImportantDatesPanel";

// ---------------------------------------------------------------------------
// API helper — used by the people search in GlobalSearchBar
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Search helpers — build searchable catalog from sidebar + all hub configs
// ---------------------------------------------------------------------------

interface SearchableService {
  title: string;
  description?: string;
  path: string;
  permission?: string | string[];
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

  function hasPermission(permission: string | string[] | undefined): boolean {
    if (!permission) return true;
    const perms = Array.isArray(permission) ? permission : [permission];
    return perms.some((p) => canRead(p));
  }

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
          if (!hasPermission(s.permission)) return false;
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
  const { favorites, toggleFavorite, isFull, isLoading, showQuickAccessHint, dismissQuickAccessHint } = useFavorites();

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

      {showQuickAccessHint && (
        <div className="flex items-start gap-2 bg-black/10 rounded-lg px-2.5 py-2 mb-1">
          <p className="text-[11px] text-white/70 leading-snug flex-1">
            Pin your own shortcuts — hover any result in search and click ★.
          </p>
          <button
            type="button"
            onClick={dismissQuickAccessHint}
            aria-label="Dismiss Quick Access hint"
            className="text-white/50 hover:text-white/80 transition-colors duration-100 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}

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

      {/* ── Main Content ── */}
      {hasTeamAccess ? (
        <>
          {/* Weekly Flags + My To-Do — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <FlagsPanel />
            <TodoPanel />
          </div>

          {/* Important Dates + Calendar — full width */}
          <div className="mt-6">
            <ImportantDatesPanel />
          </div>

          {/* Trivia — full width */}
          <div className="mt-6">
            <TriviaPanel />
          </div>
        </>
      ) : (
        /* ── Trivia + My To-Do (users without team access) — side by side ── */
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <TriviaPanel />
          <TodoPanel />
        </div>
      )}
    </div>
  );
}
