/**
 * Hub Navigation Pattern — Type Definitions
 * ==========================================
 * Defines the shape for all Hub configs.
 * Each hub has a key, title, optional subtitle, and a list of HubButtons.
 * Permission and role fields mirror MenuItem semantics from config/types.ts.
 */

export interface HubButton {
  /** Human-readable card label (bold, prominent) */
  title: string;
  /** Optional muted description shown below the title */
  description?: string;
  /** React Router path the card navigates to */
  path: string;
  /**
   * Resource name the user must have read access to.
   * Mirrors MenuItem.permission semantics.
   * e.g. 'SupervisorTimeOff', 'HolidaySwaps'
   */
  permission?: string;
  /**
   * Role the user must have to see this button.
   * Mirrors MenuItem.role semantics.
   * e.g. 'admin', 'bsa'
   */
  role?: string;
}

export interface HubSection {
  /** Section heading displayed above the card grid */
  title: string;
  /** Optional muted description below the section heading */
  description?: string;
  /** Buttons for this section — filtered by permissions at render time */
  buttons: HubButton[];
}

export interface HubConfig {
  /** kebab-case key — matches the route segment (e.g. 'time-off' → /time-off-hub) */
  key: string;
  /** Hub landing page heading */
  title: string;
  /** Optional subtitle shown below the heading */
  subtitle?: string;
  /** Flat button list — used by most hubs */
  buttons?: HubButton[];
  /** Sectioned layout — used when buttons belong to distinct groups (e.g. governance hub) */
  sections?: HubSection[];
}
