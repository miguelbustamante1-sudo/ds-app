import { useEffect } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { useMyTeamOverview } from '@/hooks/useSupervisorTimeOff';
import { SupervisorTeamGrid } from './components/SupervisorTeamGrid';

export function SupervisorTeamOverviewPage() {
  const { toast } = useToast();

  const { teamOverview, loading, loadTeamOverview } = useMyTeamOverview({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    loadTeamOverview();
  }, []);

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Supervisor Time Off Management</ToolbarPageTitle>
          <ToolbarDescription>Select a team member to manage their time-off requests</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6">
        <SupervisorTeamGrid data={teamOverview} loading={loading} />
      </div>
    </div>
  );
}
