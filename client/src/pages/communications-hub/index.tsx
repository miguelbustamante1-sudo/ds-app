import { HubPage } from '@/components/hub/HubPage';
import { communicationsHubConfig } from '@/config/hubs/communications.hub.config';

/**
 * Communications Hub Landing Page
 * Route: /communications-hub
 * Guard: visible to users with Notifications or NotificationCenter permission
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function CommunicationsHubPage() {
  return <HubPage config={communicationsHubConfig} />;
}
