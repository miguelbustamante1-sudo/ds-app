import { HubPage } from '@/components/hub/HubPage';
import { timeOffHubConfig } from '@/config/hubs/time-off.hub.config';

/**
 * Time Off Hub Landing Page
 * Route: /time-off-hub
 * Guard: visible to all authenticated users (no role restriction at sidebar level)
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function TimeOffHubPage() {
  return <HubPage config={timeOffHubConfig} />;
}
