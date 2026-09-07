/**
 * UDS Component Library — Living Styleguide
 * Route: /uds-colors (no auth required)
 *
 * Sections:
 *  1. Colors & Gradients
 *  2. Typography
 *  3. Buttons
 *  4. Badges & Pills
 *  5. Cards & Containers
 *  6. Inputs & Forms
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

// ── UI components ──────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// ── Icons ──────────────────────────────────────────────────────────────────────
import {
  Bell, Star, AlertCircle, CheckCircle2, Info, XCircle,
  Search, Palette, Type, MousePointerClick,
  Tag, CreditCard, FormInput,
} from "lucide-react";

// =============================================================================
// Helpers
// =============================================================================

type Section = "colors" | "typography" | "buttons" | "badges" | "cards" | "forms";

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "colors",     label: "Colors & Gradients", icon: <Palette className="h-4 w-4" /> },
  { key: "typography", label: "Typography",          icon: <Type className="h-4 w-4" /> },
  { key: "buttons",    label: "Buttons",              icon: <MousePointerClick className="h-4 w-4" /> },
  { key: "badges",     label: "Badges & Pills",       icon: <Tag className="h-4 w-4" /> },
  { key: "cards",      label: "Cards & Containers",   icon: <CreditCard className="h-4 w-4" /> },
  { key: "forms",      label: "Inputs & Forms",       icon: <FormInput className="h-4 w-4" /> },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-foreground mb-1">{children}</h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground mb-6">{children}</p>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h3>
  );
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 mb-6", className)}>
      {children}
    </div>
  );
}

// =============================================================================
// Section: Colors
// =============================================================================

const COLOR_SWATCHES = [
  { label: "purple-50",  cls: "bg-uds-telus-purple-50  border border-border" },
  { label: "purple-100", cls: "bg-uds-telus-purple-100" },
  { label: "purple-200", cls: "bg-uds-telus-purple-200" },
  { label: "purple-300", cls: "bg-uds-telus-purple-300" },
  { label: "purple-400", cls: "bg-uds-telus-purple-400" },
  { label: "purple-500", cls: "bg-uds-telus-purple-500" },
  { label: "purple-600", cls: "bg-uds-telus-purple-600" },
  { label: "purple-700", cls: "bg-uds-telus-purple-700" },
  { label: "purple-800", cls: "bg-uds-telus-purple-800" },
  { label: "purple-900", cls: "bg-uds-telus-purple-900" },
];

const SYSTEM_SWATCHES = [
  { label: "blue-50",   cls: "bg-uds-system-blue-50   border border-border" },
  { label: "blue-200",  cls: "bg-uds-system-blue-200" },
  { label: "blue-500",  cls: "bg-uds-system-blue-500" },
  { label: "blue-700",  cls: "bg-uds-system-blue-700" },
  { label: "green-50",  cls: "bg-uds-system-green-50  border border-border" },
  { label: "green-200", cls: "bg-uds-system-green-200" },
  { label: "green-500", cls: "bg-uds-system-green-500" },
  { label: "red-50",    cls: "bg-uds-system-red-50    border border-border" },
  { label: "red-200",   cls: "bg-uds-system-red-200" },
  { label: "red-700",   cls: "bg-uds-system-red-700" },
  { label: "amber-200", cls: "bg-uds-system-amber-200" },
  { label: "amber-500", cls: "bg-uds-system-amber-500" },
];

const GRADIENTS = [
  { label: "gradient-brand",  style: "var(--gradient-uds-telus-gradient-brand)" },
  { label: "gradient-purple", style: "var(--gradient-uds-telus-gradient-purple)" },
];

function SwatchGrid({ swatches }: { swatches: { label: string; cls: string }[] }) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
      {swatches.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-1">
          <div className={cn("w-10 h-10 rounded-lg", s.cls)} />
          <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function ColorsSection() {
  return (
    <div>
      <SectionTitle>Colors & Gradients</SectionTitle>
      <SectionDesc>Paleta completa de tokens UDS TELUS disponibles como clases Tailwind v4.</SectionDesc>

      <SubTitle>TELUS Purple Scale</SubTitle>
      <SwatchGrid swatches={COLOR_SWATCHES} />

      <SubTitle>System Colors</SubTitle>
      <SwatchGrid swatches={SYSTEM_SWATCHES} />

      <SubTitle>Gradients</SubTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {GRADIENTS.map((g) => (
          <div key={g.label} className="rounded-xl h-24 flex items-end p-3 shadow-[var(--shadow-uds-card)]"
               style={{ background: g.style }}>
            <span className="text-xs text-white font-mono">{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Section: Typography
// =============================================================================

function TypographySection() {
  return (
    <div>
      <SectionTitle>Typography</SectionTitle>
      <SectionDesc>Escala tipográfica con colores semánticos UDS.</SectionDesc>

      <SubTitle>Headings</SubTitle>
      <div className="space-y-3 mb-6">
        <h1 className="text-4xl font-bold text-foreground">Heading 1 — text-4xl bold</h1>
        <h2 className="text-3xl font-bold text-foreground">Heading 2 — text-3xl bold</h2>
        <h3 className="text-2xl font-semibold text-foreground">Heading 3 — text-2xl semibold</h3>
        <h4 className="text-xl font-semibold text-foreground">Heading 4 — text-xl semibold</h4>
        <h5 className="text-lg font-medium text-foreground">Heading 5 — text-lg medium</h5>
        <h6 className="text-base font-medium text-foreground">Heading 6 — text-base medium</h6>
      </div>

      <SubTitle>Body & Support</SubTitle>
      <div className="space-y-2 mb-6">
        <p className="text-base text-foreground">Body text — text-base text-foreground</p>
        <p className="text-sm text-foreground">Small body — text-sm text-foreground</p>
        <p className="text-sm text-muted-foreground">Muted / support — text-sm text-muted-foreground</p>
        <p className="text-xs text-muted-foreground">Caption — text-xs text-muted-foreground</p>
      </div>

      <SubTitle>Brand Colors on Text</SubTitle>
      <div className="space-y-1 mb-6">
        <p className="text-uds-telus-purple-500 font-medium">UDS Purple 500 — Primary link color</p>
        <p className="text-uds-system-blue-500 font-medium">UDS Blue 500 — Info color</p>
        <p className="text-uds-system-green-500 font-medium">UDS Green 500 — Success color</p>
        <p className="text-uds-system-red-700 font-medium">UDS Red 700 — Error color</p>
        <p className="text-uds-system-amber-500 font-medium">UDS Amber 500 — Warning color</p>
      </div>
    </div>
  );
}

// =============================================================================
// Section: Buttons
// =============================================================================

function ButtonsSection() {
  return (
    <div>
      <SectionTitle>Buttons</SectionTitle>
      <SectionDesc>Todos los variants del componente Button con colores UDS aplicados.</SectionDesc>

      <SubTitle>Size: Default</SubTitle>
      <Row>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </Row>

      <SubTitle>Size: Small</SubTitle>
      <Row>
        <Button size="sm" variant="primary">Primary SM</Button>
        <Button size="sm" variant="secondary">Secondary SM</Button>
        <Button size="sm" variant="outline">Outline SM</Button>
        <Button size="sm" variant="destructive">Destructive SM</Button>
      </Row>

      <SubTitle>Size: Large</SubTitle>
      <Row>
        <Button size="lg" variant="primary">Primary LG</Button>
        <Button size="lg" variant="secondary">Secondary LG</Button>
        <Button size="lg" variant="outline">Outline LG</Button>
      </Row>

      <SubTitle>States</SubTitle>
      <Row>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary">
          <Bell className="h-4 w-4 mr-1.5" /> With Icon
        </Button>
        <Button variant="outline">
          <Search className="h-4 w-4 mr-1.5" /> Search
        </Button>
      </Row>

      <SubTitle>UDS Manual (span-based) — usado en filtros</SubTitle>
      <Row>
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border bg-uds-telus-purple-500 text-white border-uds-telus-purple-500 cursor-pointer">
          Active Filter
        </span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border bg-muted text-muted-foreground border-transparent cursor-pointer hover:border-uds-system-grey-300">
          Inactive Filter
        </span>
      </Row>
    </div>
  );
}

// =============================================================================
// Section: Badges & Pills
// =============================================================================

function BadgesSection() {
  return (
    <div>
      <SectionTitle>Badges & Pills</SectionTitle>
      <SectionDesc>Estados semánticos con tokens de color UDS.</SectionDesc>

      <SubTitle>Component Badge Variants</SubTitle>
      <Row>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </Row>

      <SubTitle>UDS Semantic Pills (span-based)</SubTitle>
      <Row>
        <span className="inline-flex items-center gap-1 rounded-md border border-uds-system-blue-200 bg-uds-system-blue-50 px-2 py-0.5 text-xs font-medium text-uds-system-blue-700">
          <Info className="h-3 w-3" /> Info
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-uds-system-green-200 bg-uds-system-green-50 px-2 py-0.5 text-xs font-medium text-uds-system-green-700">
          <CheckCircle2 className="h-3 w-3" /> Success
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-uds-system-amber-200 bg-uds-system-amber-50 px-2 py-0.5 text-xs font-medium text-uds-system-amber-700">
          <AlertCircle className="h-3 w-3" /> Warning
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-uds-system-red-200 bg-uds-system-red-50 px-2 py-0.5 text-xs font-medium text-uds-system-red-700">
          <XCircle className="h-3 w-3" /> Error
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-uds-telus-purple-200 bg-uds-telus-purple-50 px-2 py-0.5 text-xs font-medium text-uds-telus-purple-700">
          <Star className="h-3 w-3" /> Brand
        </span>
      </Row>

      <SubTitle>Report Level Pills (como en My Team)</SubTitle>
      <Row>
        {[1, 2, 3, 4].map((l) => (
          <span key={l} className="inline-flex items-center rounded-md border border-uds-system-blue-200 bg-uds-system-blue-50 px-2 py-0.5 text-xs font-medium text-uds-system-blue-700">
            Level {l}
          </span>
        ))}
      </Row>

      <SubTitle>Overdue Badge (como en Awaiting Action)</SubTitle>
      <Row>
        <span className="inline-flex items-center gap-1 rounded-full bg-uds-system-red-200 px-2 py-0.5 text-xs font-medium text-uds-system-red-700">
          <AlertCircle className="h-3 w-3" /> 3 overdue
        </span>
      </Row>
    </div>
  );
}

// =============================================================================
// Section: Cards & Containers
// =============================================================================

function CardsSection() {
  return (
    <div>
      <SectionTitle>Cards & Containers</SectionTitle>
      <SectionDesc>Variantes de Card con sombras y bordes UDS personalizados.</SectionDesc>

      <SubTitle>Card Default (border-top purple + UDS shadow)</SubTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Descripción de soporte de la card.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenido de la card. Nótese el border-top morado y la sombra con tinte TELUS purple.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Card con Icono</CardTitle>
            <CardDescription>Card típica de dashboard con encabezado con icono.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-uds-telus-purple-500" />
              <span className="text-sm font-medium">Notificaciones pendientes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SubTitle>Panel de Dashboard (shadow-uds-card + hover)</SubTitle>
      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-uds-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-uds-card-hover)] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Panel de Dashboard</span>
          <span className="text-xs text-muted-foreground">Ver todo →</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Este es un panel genérico con <code className="text-xs font-mono bg-muted px-1 rounded">shadow-[var(--shadow-uds-card)]</code> y
          hover que eleva a <code className="text-xs font-mono bg-muted px-1 rounded">shadow-[var(--shadow-uds-card-hover)]</code>.
        </p>
      </div>

      <SubTitle>Hero Elevated (shadow-uds-card-elevated + gradient)</SubTitle>
      <div
        className="rounded-2xl p-8 text-center shadow-[var(--shadow-uds-card-elevated)] mb-6"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <h2 className="text-2xl font-bold text-white">Welcome back, User! 👋</h2>
        <p className="mt-1 text-sm text-uds-telus-purple-100">
          Hero card con gradiente TELUS purple → magenta y sombra elevada.
        </p>
      </div>

      <SubTitle>Favorite Quick-Link Card (como en Dashboard)</SubTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {["My Time Off", "My Team", "Pending Requests", "Reports"].map((label) => (
          <div key={label} className="group relative">
            <button
              type="button"
              className="w-full rounded-xl border border-uds-telus-purple-200 bg-card shadow-xs px-4 py-3 text-sm font-medium text-foreground text-left hover:border-uds-telus-purple-400 hover:bg-uds-telus-purple-50 hover:shadow-sm transition-all duration-150 pr-8"
            >
              {label}
            </button>
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Section: Inputs & Forms
// =============================================================================

function FormsSection() {
  const [val, setVal] = useState("");
  const [toggle, setToggle] = useState("option1");

  return (
    <div>
      <SectionTitle>Inputs & Forms</SectionTitle>
      <SectionDesc>Campos con focus ring y border en tokens UDS purple.</SectionDesc>

      <SubTitle>Text Input</SubTitle>
      <div className="max-w-sm mb-6">
        <Input
          placeholder="Escribe algo…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="focus:ring-2 focus:ring-uds-telus-purple-400/50 focus:border-uds-telus-purple-400"
        />
      </div>

      <SubTitle>Search Input (como GlobalSearchBar)</SubTitle>
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-uds-telus-purple-300 pointer-events-none" />
        <input
          type="search"
          placeholder="Search for anything…"
          className="w-full rounded-full border border-uds-telus-purple-200 bg-background py-3 pl-12 pr-5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-uds-telus-purple-400/50 focus:border-uds-telus-purple-400 transition-shadow duration-150"
        />
      </div>

      <SubTitle>Toggle Group (como filtros de nivel)</SubTitle>
      <div className="mb-6">
        <ToggleGroup type="single" value={toggle} onValueChange={(v) => v && setToggle(v)}>
          <ToggleGroupItem value="option1">Option 1</ToggleGroupItem>
          <ToggleGroupItem value="option2">Option 2</ToggleGroupItem>
          <ToggleGroupItem value="option3">Option 3</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <SubTitle>Filter Buttons (como Pending Requests)</SubTitle>
      <div className="flex gap-2 mb-6">
        {["All", "Time Off", "Holiday Swaps"].map((label, i) => (
          <button
            key={label}
            className={[
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
              i === 0
                ? "bg-uds-telus-purple-500 text-white border-uds-telus-purple-500"
                : "bg-muted text-muted-foreground border-transparent hover:border-uds-system-grey-300 hover:bg-muted/80",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <SubTitle>Notification Tab (como Notification Center)</SubTitle>
      <div className="flex border-b border-border w-full max-w-sm mb-6">
        {["Unread", "Read", "Archived"].map((t, i) => (
          <button
            key={t}
            className={cn(
              "pb-2 pt-1 mr-5 text-sm font-medium transition-colors border-b-2 -mb-px",
              i === 0
                ? "border-uds-telus-purple-500 text-uds-telus-purple-500"
                : "border-transparent text-muted-foreground hover:text-uds-telus-purple-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export function UdsColorDemoPage() {
  const [active, setActive] = useState<Section>("colors");

  const ActiveSection = {
    colors:     <ColorsSection />,
    typography: <TypographySection />,
    buttons:    <ButtonsSection />,
    badges:     <BadgesSection />,
    cards:      <CardsSection />,
    forms:      <FormsSection />,
  }[active];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="py-10 px-6 text-center shadow-[var(--shadow-uds-card-elevated)]"
        style={{ background: "var(--gradient-uds-telus-gradient-purple)" }}
      >
        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
          UDS Component Library
        </h1>
        <p className="mt-1 text-sm text-uds-telus-purple-100">
          Living styleguide — tokens, componentes y patrones TELUS UDS en Tailwind v4
        </p>
      </div>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar nav */}
          <aside className="w-full lg:w-52 shrink-0">
            <nav className="sticky top-6 space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                    active === s.key
                      ? "bg-uds-telus-purple-500 text-white"
                      : "text-muted-foreground hover:bg-uds-telus-purple-50 hover:text-uds-telus-purple-700",
                  )}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {ActiveSection}
          </main>
        </div>
      </div>
    </div>
  );
}
