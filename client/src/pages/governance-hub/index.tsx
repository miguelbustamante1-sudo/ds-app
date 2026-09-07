import { HubPage } from '@/components/hub/HubPage';
import { governanceHubConfig } from '@/config/hubs/governance.hub.config';

/**
 * System Governance Hub Landing Page
 * Route: /governance-hub
 * Guard: visible to users with admin OR bsa role (sidebar gate)
 *
 * Renders two sections:
 *  - Access Control (admin only): Roles, Resources, Permissions Matrix
 *  - Master Data Maintenance (bsa): all reference data tables
 *
 * Each section is independently RBAC-filtered at render time.
 */
export default function GovernanceHubPage() {
  return <HubPage config={governanceHubConfig} />;
}
