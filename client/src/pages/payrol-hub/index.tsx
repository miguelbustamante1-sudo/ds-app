import { HubPage } from '@/components/hub/HubPage';
import { payrolHubConfig } from '@/config/hubs/payrol.hub.config';

export default function PayrolHubPage() {
  return <HubPage config={payrolHubConfig} />;
}
