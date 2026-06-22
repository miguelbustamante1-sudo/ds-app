import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { WorkflowTasksTab } from './WorkflowTasksTab';
import { StandaloneTasksTab } from '@/pages/standalone-tasks/StandaloneTasksTab';

export function TaskInboxPage() {
  const { canRead } = usePermissions();

  if (!canRead('Workflow') && !canRead('StandaloneTask')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>My Tasks — Awaiting Action</ToolbarPageTitle>
          <ToolbarDescription>Tasks assigned to you or available to claim</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Tabs defaultValue={canRead('StandaloneTask') ? 'standalone' : 'workflow'} className="mt-6">
        <TabsList>
          {canRead('StandaloneTask') && (
            <TabsTrigger value="standalone">Standalone Tasks</TabsTrigger>
          )}
          {canRead('Workflow') && (
            <TabsTrigger value="workflow">Workflow Tasks</TabsTrigger>
          )}
        </TabsList>

        {canRead('StandaloneTask') && (
          <TabsContent value="standalone">
            <StandaloneTasksTab />
          </TabsContent>
        )}
        {canRead('Workflow') && (
          <TabsContent value="workflow">
            <WorkflowTasksTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
