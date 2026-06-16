/**
 * HeroLabPage — Hero + Favorites Design Sandbox
 * ===============================================
 * Public route: /hero-lab (no auth required — shareable with José for POC review).
 *
 * Shows 4 candidate layouts for integrating favorites into the hero/welcome space.
 * Uses local sample data — cannot call useFavorites() on a public route (would 401).
 * Pick the preferred variant, then wire it into the real Layout1Page.
 *
 * Remove this page and the /hero-lab route once a direction is chosen.
 */

import { useState } from 'react';
import {
  Star,
  Search,
  Umbrella,
  Users,
  CalendarCheck,
  ArrowRightLeft,
  CalendarDays,
  LayoutGrid,
  Bell,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (mirror FavoriteLink from favorites-context)
// ---------------------------------------------------------------------------

interface FavoriteLink {
  id: string;
  label: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Sample data (mirrors DEFAULT_FAVORITES + a few extras for visual density)
// ---------------------------------------------------------------------------

const SAMPLE_FAVORITES: FavoriteLink[] = [
  { id: '/my-time-off',         label: 'My Time Off',     path: '/my-time-off' },
  { id: '/time-off-management', label: 'Time Off Review',  path: '/time-off-management' },
  { id: '/my-team',             label: 'Team Members',     path: '/my-team' },
  { id: '/bench-move',          label: 'Bench Move',       path: '/bench-move' },
  { id: '/holiday-swaps',       label: 'Holiday Swaps',    path: '/holiday-swaps' },
  { id: '/notification-center', label: 'Notifications',    path: '/notification-center' },
  { id: '/',                    label: 'Dashboard',        path: '/' },
];

// ---------------------------------------------------------------------------
// Path → icon mapping (for icon-tile and icon-card variants)
// ---------------------------------------------------------------------------

const PATH_ICON: Record<string, LucideIcon> = {
  '/my-time-off':         Umbrella,
  '/time-off-management': CalendarDays,
  '/my-team':             Users,
  '/bench-move':          ArrowRightLeft,
  '/holiday-swaps':       CalendarCheck,
  '/notification-center': Bell,
  '/':                    LayoutGrid,
};

function getIcon(path: string): LucideIcon {
  return PATH_ICON[path] ?? Star;
}

// ---------------------------------------------------------------------------
// Shared: purple gradient hero base props (verbatim from page.tsx hero)
// ---------------------------------------------------------------------------

const HERO_STYLE = { background: 'var(--gradient-uds-telus-gradient-purple)' };
const HERO_CLS = 'rounded-2xl shadow-[var(--shadow-uds-card-elevated)] px-6 text-white';

// ---------------------------------------------------------------------------
// Shared: static search-bar placeholder (visual mock — no live queries)
// ---------------------------------------------------------------------------

function StaticSearchBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2.5 w-full max-w-md',
        'bg-white/15 border border-white/25 backdrop-blur-sm',
        'text-white/70 text-sm select-none cursor-default',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Buscar servicios, personas…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: unpin star (visual only in sandbox)
// ---------------------------------------------------------------------------

function UnpinStar() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-uds-system-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded"
    >
      <Star className="h-3.5 w-3.5 fill-current" />
    </span>
  );
}

// ===========================================================================
// VARIANT 1 — Glass tiles in gradient
// Favorites as glassmorphic tiles inside the purple band, below greeting+search.
// ===========================================================================

function GlassTilesVariant() {
  const [pinned, setPinned] = useState<Set<string>>(
    new Set(SAMPLE_FAVORITES.map((f) => f.id)),
  );

  return (
    <section
      className={cn(HERO_CLS, 'flex flex-col items-center gap-6 py-10 text-center')}
      style={HERO_STYLE}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
          Welcome back, Pablo! 👋
        </h1>
        <p className="mt-1 text-sm text-uds-telus-purple-100">
          Here's what needs your attention today.
        </p>
      </div>

      <StaticSearchBar />

      {/* Glassmorphic favorite tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-2xl">
        {SAMPLE_FAVORITES.filter((f) => pinned.has(f.id)).map((fav) => (
          <div key={fav.id} className="group relative">
            <button
              type="button"
              className={cn(
                'w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white text-left',
                'bg-white/10 border border-white/20 backdrop-blur-sm',
                'hover:bg-white/20 hover:border-white/35 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                'pr-8',
              )}
            >
              {fav.label}
            </button>
            <button
              type="button"
              title={`Unpin ${fav.label}`}
              onClick={() =>
                setPinned((prev) => {
                  const next = new Set(prev);
                  next.delete(fav.id);
                  return next;
                })
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-uds-system-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded focus-visible:opacity-100"
            >
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===========================================================================
// VARIANT 2 — Split hero panel
// Left: greeting + search. Right: Quick Access list.
// ===========================================================================

function SplitHeroVariant() {
  return (
    <section
      className={cn(HERO_CLS, 'grid grid-cols-1 lg:grid-cols-5 gap-6 py-8')}
      style={HERO_STYLE}
    >
      {/* Left — greeting + search */}
      <div className="lg:col-span-3 flex flex-col justify-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
            Welcome back, Pablo! 👋
          </h1>
          <p className="mt-1 text-sm text-uds-telus-purple-100">
            Here's what needs your attention today.
          </p>
        </div>
        <StaticSearchBar className="max-w-sm" />
      </div>

      {/* Right — Quick Access */}
      <div
        className="lg:col-span-2 flex flex-col gap-1.5 bg-white/10 border border-white/20 rounded-xl px-4 py-3 backdrop-blur-sm"
      >
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
          ⭐ Quick Access
        </p>
        {SAMPLE_FAVORITES.slice(0, 5).map((fav) => (
          <button
            key={fav.id}
            type="button"
            className={cn(
              'flex items-center justify-between w-full rounded-lg px-3 py-1.5',
              'text-sm font-medium text-white/90 text-left',
              'hover:bg-white/15 transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
            )}
          >
            {fav.label}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

// ===========================================================================
// VARIANT 3 — Icon-tile rail
// Compact hero + horizontal scrollable rail of square icon tiles below.
// ===========================================================================

function IconTileRailVariant() {
  return (
    <div className="flex flex-col gap-3">
      {/* Compact hero */}
      <section
        className={cn(HERO_CLS, 'flex flex-col items-center gap-4 py-7 text-center')}
        style={HERO_STYLE}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">
            Welcome back, Pablo! 👋
          </h1>
          <p className="mt-1 text-sm text-uds-telus-purple-100">
            Here's what needs your attention today.
          </p>
        </div>
        <StaticSearchBar />
      </section>

      {/* Icon rail */}
      <div
        className={cn(
          'flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border',
        )}
      >
        {SAMPLE_FAVORITES.map((fav) => {
          const Icon = getIcon(fav.id);
          return (
            <button
              key={fav.id}
              type="button"
              className={cn(
                'flex flex-col items-center justify-center gap-2 snap-start shrink-0',
                'w-[88px] h-[88px] rounded-2xl',
                'bg-card border border-border shadow-xs',
                'hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm transition-all duration-150',
                'text-xs font-medium text-foreground text-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                'px-2',
              )}
              title={fav.label}
            >
              <Icon className="h-5 w-5 text-uds-telus-purple-500 shrink-0" aria-hidden="true" />
              <span className="leading-tight line-clamp-2">{fav.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// VARIANT 4 — Icon card grid
// Current placement, upgraded from plain text to icon + label cards.
// ===========================================================================

function IconCardGridVariant() {
  return (
    <div className="flex flex-col gap-4">
      {/* Same gradient hero as today */}
      <section
        className={cn(HERO_CLS, 'flex flex-col items-center gap-6 py-10 text-center')}
        style={HERO_STYLE}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">
            Welcome back, Pablo! 👋
          </h1>
          <p className="mt-1 text-sm text-uds-telus-purple-100">
            Here's what needs your attention today.
          </p>
        </div>
        <StaticSearchBar />
      </section>

      {/* Upgraded icon cards (current grid position, richer style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {SAMPLE_FAVORITES.map((fav) => {
          const Icon = getIcon(fav.id);
          return (
            <div key={fav.id} className="group relative">
              <button
                type="button"
                className={cn(
                  'w-full rounded-xl border border-border bg-card shadow-xs',
                  'flex items-center gap-3 px-4 py-3',
                  'text-sm font-medium text-foreground text-left',
                  'hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  'pr-10',
                )}
              >
                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-uds-telus-purple-50 shrink-0">
                  <Icon className="h-4 w-4 text-uds-telus-purple-600" aria-hidden="true" />
                </span>
                <span className="truncate">{fav.label}</span>
              </button>
              <button
                type="button"
                title={`Unpin ${fav.label}`}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-uds-system-amber-400 hover:text-uds-system-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded focus-visible:opacity-100"
              >
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// Main page
// ===========================================================================

type VariantId = 'glass' | 'split' | 'rail' | 'grid';

const VARIANTS: { id: VariantId; title: string; tagline: string; component: React.ReactNode }[] = [
  {
    id: 'glass',
    title: 'Variant A — Glass tiles in gradient',
    tagline: 'Favorites as glassmorphic tiles inside the purple band. One unified hero block.',
    component: <GlassTilesVariant />,
  },
  {
    id: 'split',
    title: 'Variant B — Split hero panel',
    tagline: 'Greeting + search on the left; dedicated Quick Access list on the right.',
    component: <SplitHeroVariant />,
  },
  {
    id: 'rail',
    title: 'Variant C — Icon-tile rail',
    tagline: 'Compact hero, then a horizontal scrollable rail of square icon tiles below.',
    component: <IconTileRailVariant />,
  },
  {
    id: 'grid',
    title: 'Variant D — Icon card grid',
    tagline: 'Current grid position, upgraded from plain text to icon + label cards.',
    component: <IconCardGridVariant />,
  },
];

export function HeroLabPage() {
  const [selected, setSelected] = useState<VariantId | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b bg-card px-6 py-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Hero Favorites — POC Lab</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 design candidates for §3.2 Hero Favorites. Pick one → wire into{' '}
              <code className="font-mono bg-muted px-1 rounded">Layout1Page</code>.
              {' '}Remove this page once direction is locked.
            </p>
          </div>
          {selected && (
            <div className="flex items-center gap-2 text-sm font-medium text-uds-telus-purple-600">
              <Star className="h-4 w-4 fill-current text-uds-system-amber-400" aria-hidden="true" />
              Selected: {VARIANTS.find((v) => v.id === selected)?.title.split('—')[1]?.trim()}
            </div>
          )}
        </div>
      </div>

      {/* Variants */}
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-14">
        {VARIANTS.map((v) => (
          <section key={v.id} aria-labelledby={`variant-${v.id}-title`}>
            {/* Variant label + pick button */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2
                  id={`variant-${v.id}-title`}
                  className="text-base font-semibold text-foreground"
                >
                  {v.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{v.tagline}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(selected === v.id ? null : v.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  selected === v.id
                    ? 'bg-uds-telus-purple-600 border-uds-telus-purple-600 text-white shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:border-uds-telus-purple-400 hover:text-uds-telus-purple-600',
                )}
              >
                {selected === v.id ? (
                  <>
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Selected
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> Pick this
                  </>
                )}
              </button>
            </div>

            {/* Variant preview */}
            <div
              className={cn(
                'rounded-2xl border-2 transition-colors duration-150 p-1',
                selected === v.id
                  ? 'border-uds-telus-purple-500 shadow-[0_0_0_4px_var(--uds-telus-purple-100)]'
                  : 'border-transparent',
              )}
            >
              {v.component}
            </div>
          </section>
        ))}

        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground pb-6">
          POC sandbox — <code className="font-mono bg-muted px-1 rounded">/hero-lab</code> — remove route + page after direction is chosen.
        </p>
      </div>
    </div>
  );
}
