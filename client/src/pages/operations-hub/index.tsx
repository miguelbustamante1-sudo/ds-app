import { HubPage } from '@/components/hub/HubPage';
import { operationsHubConfig } from '@/config/hubs/operations.hub.config';

/**
 * Operations & Administration Hub Landing Page
 * Route: /operations-hub
 * Guard: visible to users with PersistenceTables permission, bsa or admin role
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function OperationsHubPage() {
  return <HubPage config={operationsHubConfig} />;
}
