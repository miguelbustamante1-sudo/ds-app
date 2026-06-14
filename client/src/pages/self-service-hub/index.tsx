import { HubPage } from '@/components/hub/HubPage';
import { selfServiceHubConfig } from '@/config/hubs/self-service.hub.config';

/**
 * Self Service Hub Landing Page
 * Route: /self-service-hub
 * Guard: visible to all authenticated users
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function SelfServiceHubPage() {
  return <HubPage config={selfServiceHubConfig} />;
}
