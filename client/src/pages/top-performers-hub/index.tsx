import { HubPage } from '@/components/hub/HubPage';
import { topPerformersHubConfig } from '@/config/hubs/top-performers.hub.config';

export default function TopPerformersHubPage() {
  return <HubPage config={topPerformersHubConfig} />;
}
