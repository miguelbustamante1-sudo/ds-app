import { HubPage } from '@/components/hub/HubPage';
import { performanceManagementHubConfig } from '@/config/hubs/performance-management.hub.config';

export default function PerformanceManagementHubPage() {
  return <HubPage config={performanceManagementHubConfig} />;
}
