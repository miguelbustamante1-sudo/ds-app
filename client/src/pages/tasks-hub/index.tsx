import { HubPage } from '@/components/hub/HubPage';
import { tasksHubConfig } from '@/config/hubs/tasks.hub.config';

export default function TasksHubPage() {
  return <HubPage config={tasksHubConfig} />;
}
