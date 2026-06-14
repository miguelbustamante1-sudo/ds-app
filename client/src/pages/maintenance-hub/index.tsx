import { HubPage } from '@/components/hub/HubPage';
import { maintenanceHubConfig } from '@/config/hubs/maintenance.hub.config';

/**
 * Maintenance Hub Landing Page
 * Route: /maintenance-hub
 * Guard: role 'bsa' (applied at sidebar level; individual cards also check permissions)
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 *
 * Note: This hub has 16 buttons. The responsive grid (1→2→3 cols) handles
 * the larger set gracefully without any layout overrides.
 */
export default function MaintenanceHubPage() {
  return <HubPage config={maintenanceHubConfig} />;
}
