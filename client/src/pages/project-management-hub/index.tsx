import { HubPage } from '@/components/hub/HubPage';
import { projectManagementHubConfig } from '@/config/hubs/project-management.hub.config';

/**
 * Project Management Hub Landing Page
 * Route: /project-management-hub
 * Guard: visible to all authenticated users with BenchMove or TeamMemberProjects permission
 *
 * Thin component — all rendering, filtering, skeleton loading,
 * empty state, and a11y logic live in the shared <HubPage> component.
 */
export default function ProjectManagementHubPage() {
  return <HubPage config={projectManagementHubConfig} />;
}
