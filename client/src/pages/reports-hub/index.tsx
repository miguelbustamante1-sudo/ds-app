import { HubPage } from '@/components/hub/HubPage';
import { reportsHubConfig } from '@/config/hubs/reports.hub.config';

/**
 * Reports Hub Landing Page
 * Route: /reports-hub
 * Guard: visible to users with Reports permission
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function ReportsHubPage() {
  return <HubPage config={reportsHubConfig} />;
}
