import { HubPage } from '@/components/hub/HubPage';
import { hiringHubConfig } from '@/config/hubs/hiring.hub.config';

/**
 * Hiring Hub Landing Page
 * Route: /hiring-hub
 * Guard: role 'bsa' (applied at sidebar level; individual cards also check permissions)
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function HiringHubPage() {
  return <HubPage config={hiringHubConfig} />;
}
