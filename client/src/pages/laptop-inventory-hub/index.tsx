import { HubPage } from '@/components/hub/HubPage';
import { laptopInventoryHubConfig } from '@/config/hubs/laptop-inventory.hub.config';

export default function LaptopInventoryHubPage() {
  return <HubPage config={laptopInventoryHubConfig} />;
}
