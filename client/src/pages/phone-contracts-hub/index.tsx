import { HubPage } from '@/components/hub/HubPage';
import { phoneContractsHubConfig } from '@/config/hubs/phone-contracts.hub.config';

export default function PhoneContractsHubPage() {
  return <HubPage config={phoneContractsHubConfig} />;
}
