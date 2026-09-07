import { HubPage } from '@/components/hub/HubPage';
import { securityHubConfig } from '@/config/hubs/security.hub.config';

/**
 * Security Hub Landing Page
 * Route: /security-hub
 * Guard: role 'admin' (applied at sidebar level; individual cards also check permissions)
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function SecurityHubPage() {
  return <HubPage config={securityHubConfig} />;
}
