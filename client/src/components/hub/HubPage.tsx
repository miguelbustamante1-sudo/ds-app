/**
 * HubPage — Generic Hub Landing Page Component
 * =============================================
 *
 * UX/UI Design Rationale (Senior UX + GenUI Perspective)
 * -------------------------------------------------------
 *
 * 1. SKELETON LOADER (AI UX / Async States)
 *    Auth context resolves asynchronously. Rather than blocking the user with
 *    a spinner, we render 6 card-shaped skeleton placeholders that match the
 *    final grid layout exactly. This eliminates layout shift (CLS) and gives
 *    the user an immediate sense of the page structure.
 *
 * 2. EMPTY STATE — GRACEFUL DEGRADATION
 *    If the user has no visible buttons (all filtered by RBAC), we show a
 *    descriptive empty state with an icon, a human-readable message, and an
 *    actionable "Go to Dashboard" escape hatch. Never a blank page or a raw
 *    technical error.
 *
 * 3. ACCESSIBLE DYNAMIC UPDATES (a11y)
 *    The card grid container carries aria-live="polite" so screen readers
 *    announce when options load or when the empty state appears, without
 *    interrupting ongoing narration. Each card is a true <button> with an
 *    aria-label that combines title + description for unambiguous screen-reader
 *    output.
 *
 * 4. KEYBOARD & FOCUS MANAGEMENT
 *    Cards are rendered as <button> elements (not clickable <div>s), ensuring
 *    native keyboard focus, Enter/Space activation, and correct tab order out
 *    of the box — no extra ARIA role needed.
 *
 * 5. MICRO-INTERACTIONS
 *    Cards use Tailwind `group` to animate an arrow icon on hover/focus,
 *    giving clear directional affordance. The border color and background
 *    tint shift subtly on hover (transition-all) for a polished SAP-Fiori-
 *    inspired feel without being distracting.
 *
 * 6. FUTURE-READY SUMMARY SECTION
 *    A visually distinct `data-slot="hub-summary"` placeholder is rendered at
 *    the top of the content area (currently empty). When Sprint N delivers
 *    contextual data (e.g. balance remaining, pending request count), it drops
 *    straight into this slot without touching the card grid below.
 *
 * 7. RESPONSIVE GRID
 *    1 col (mobile) → 2 cols (md/tablet) → 3 cols (lg/desktop), matching the
 *    requirement. Maintenance hub with 16 cards benefits from this layout
 *    without requiring a separate component.
 */

import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutGrid, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from "@/components/ui/toolbar";
import type { HubButton, HubConfig, HubSection } from "@/config/hubs/hub.types";
import { useVisibleHubButtons } from "@/hooks/use-visible-hub-buttons";
import { useAuth } from "@/auth/auth-provider";
import { useFavorites } from "@/contexts/favorites-context";

// ---------------------------------------------------------------------------
// Sub-component: HubCardSkeleton
// Renders a single card-shaped placeholder during loading.
// ---------------------------------------------------------------------------
function HubCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs"
    >
      {/* Title line */}
      <Skeleton className="h-5 w-2/3" />
      {/* Description lines */}
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HubCardSkeletonGrid
// Shows N skeleton cards while permissions are resolving.
// ---------------------------------------------------------------------------
function HubCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading options…"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <HubCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HubEmptyState
// Shown when the user has no visible buttons (all filtered by RBAC).
// ---------------------------------------------------------------------------
function HubEmptyState({ hubTitle }: { hubTitle: string }) {
  const navigate = useNavigate();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-20 text-center"
    >
      {/* Illustration substitute — generic icon in a muted circle */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <LayoutGrid
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold text-mono">
          No options available
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          You don't have permission to access any {hubTitle} options. Contact
          your administrator if you think this is a mistake.
        </p>
      </div>

      {/* Actionable escape hatch — never leave the user stranded */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/")}
        aria-label="Go back to the Dashboard"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HubCard
// A single navigable option card. Rendered as a true <button> for a11y.
// Includes a star toggle to pin/unpin the card as a Dashboard Quick Link.
// ---------------------------------------------------------------------------
interface HubCardProps {
  button: HubButton;
}

function HubCard({ button }: HubCardProps) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, isFull } = useFavorites();

  const pinned = isFavorite(button.path);
  const canPin = pinned || !isFull;

  const ariaLabel = button.description
    ? `${button.title} — ${button.description}`
    : button.title;

  function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canPin) return;
    toggleFavorite({ id: button.path, label: button.title, path: button.path });
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => navigate(button.path)}
      className={cn(
        // Base layout
        "group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-5 shadow-xs text-left w-full",
        // Micro-interaction: subtle background shift + border highlight on hover/focus
        "transition-all duration-150 ease-in-out",
        "hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Active press feel
        "active:scale-[0.99]",
      )}
    >
      {/* Card title row */}
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-semibold leading-tight text-card-foreground">
          {button.title}
        </span>

        <div className="flex items-center gap-2">
          {/*
            ── Favorite star toggle ──
            Shown dimly at rest; full yellow when pinned.
            Uses stopPropagation so clicking the star doesn't navigate.
          */}
          <span
            role="button"
            tabIndex={canPin ? 0 : -1}
            aria-label={
              pinned
                ? `Unpin ${button.title} from Quick Links`
                : !canPin
                  ? `Quick Links limit reached (8/8)`
                  : `Pin ${button.title} to Quick Links`
            }
            aria-pressed={pinned}
            aria-disabled={!canPin}
            onClick={handleToggleFavorite}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleFavorite(e as unknown as React.MouseEvent); }}
            className={cn(
              "rounded p-0.5 transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pinned
                ? "text-uds-system-amber-400 hover:text-uds-system-amber-500"
                : !canPin
                  ? "text-muted-foreground/20 opacity-0 group-hover:opacity-100 cursor-not-allowed"
                  : "text-muted-foreground/40 hover:text-uds-system-amber-400 opacity-0 group-hover:opacity-100",
            )}
          >
            <Star
              aria-hidden="true"
              className={cn("h-4 w-4", pinned && "fill-current")}
            />
          </span>

          {/* Arrow icon — animates right on hover for directional affordance */}
          <ArrowRight
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground",
              "transition-transform duration-150 ease-in-out",
              "group-hover:translate-x-0.5 group-hover:text-primary",
            )}
          />
        </div>
      </div>

      {/* Optional description */}
      {button.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {button.description}
        </p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HubSectionGrid
// Renders a single named section within a sectioned hub (e.g. governance).
// Calls useVisibleHubButtons for its own buttons so each section is
// independently filtered by RBAC — hidden if user has no visible buttons.
// ---------------------------------------------------------------------------
function HubSectionGrid({ section }: { section: HubSection }) {
  const visibleButtons = useVisibleHubButtons(section.buttons);

  if (visibleButtons.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
      </div>
      <div
        role="list"
        aria-label={`${section.title} options`}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {visibleButtons.map((btn) => (
          <div key={btn.path} role="listitem">
            <HubCard button={btn} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HubSummarySection
// Future-ready placeholder for contextual summary data (sprint TBD).
// Currently renders nothing visible; keeps the DOM slot available.
// ---------------------------------------------------------------------------
function HubSummarySection() {
  // TODO (future sprint): render balance / pending count / contextual widgets here.
  // Return null keeps the visual layout clean until the data source is defined.
  return null;
}

// ---------------------------------------------------------------------------
// Main exported component: HubPage
// ---------------------------------------------------------------------------
export interface HubPageProps {
  /** The hub configuration object (title, subtitle, full button list). */
  config: HubConfig;
  /**
   * Optional CSS class applied to the outermost container.
   * Useful if a specific hub needs minor layout overrides.
   */
  className?: string;
}

export function HubPage({ config, className }: HubPageProps) {
  const { loading } = useAuth();

  // For flat mode: filter the button list once at the top level.
  // Called unconditionally (hooks rule); ignored when config.sections is set.
  const visibleButtons = useVisibleHubButtons(config.buttons ?? []);

  const isSectioned = Boolean(config.sections?.length);

  return (
    <div className={cn("container", className)}>
      {/* ── Page header ── */}
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>{config.title}</ToolbarPageTitle>
          {config.subtitle && (
            <ToolbarDescription>{config.subtitle}</ToolbarDescription>
          )}
        </ToolbarHeading>
      </Toolbar>

      {/* ── Future-ready summary section (currently empty) ── */}
      <HubSummarySection />

      {/*
        ── Card grid region ──
        aria-live="polite": screen readers announce content changes
        (loading → cards, or loading → empty state) without interrupting
        any speech already in progress.
      */}
      <div
        aria-live="polite"
        aria-label={`${config.title} options`}
        className="mt-2"
      >
        {loading ? (
          /* Skeleton loader while auth context resolves — no spinner */
          <HubCardSkeletonGrid count={6} />
        ) : isSectioned ? (
          /* Sectioned mode: each section is independently RBAC-filtered */
          <div className="space-y-8">
            {config.sections!.map((section) => (
              <HubSectionGrid key={section.title} section={section} />
            ))}
          </div>
        ) : visibleButtons.length === 0 ? (
          /* Graceful degradation: empty state with actionable message */
          <HubEmptyState hubTitle={config.title} />
        ) : (
          /* Success state: responsive card grid */
          <div
            role="list"
            aria-label={`${config.title} navigation options`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {visibleButtons.map((btn) => (
              <div key={btn.path} role="listitem">
                <HubCard button={btn} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
