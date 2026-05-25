import { useEffect, useState } from 'react';
import { Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSupervisorReports } from '@/pages/comp-time/hooks/useSupervisorReports';
import { useCompTimeBalance } from '@/pages/comp-time/hooks/useCompTimeBalance';
import { useActiveProjects } from '@/pages/comp-time/hooks/useActiveProjects';
import { IntakeEntryForm } from '@/pages/comp-time/intake/components/IntakeEntryForm';
import { UsageEntryForm } from '@/pages/comp-time/usage/components/UsageEntryForm';
import { ShiftsView } from '@/pages/comp-time/usage/components/ShiftsView';
import { TeamMemberSelector } from './components/TeamMemberSelector';
import { SupervisorCompTimeGrid } from './components/SupervisorCompTimeGrid';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

export function SupervisorCompTimePage() {
  const { toast } = useToast();
  const { reports, loading: reportsLoading, error: reportsError, loadReports } = useSupervisorReports();

  const [selectedMember, setSelectedMember] = useState<TeamMemberReportDTO | null>(null);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);

  const { balance, fetchBalance } = useCompTimeBalance();
  const { options: projects, loading: projectsLoading } = useActiveProjects(
    selectedMember?.teamMemberId ?? null,
  );

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (reportsError) {
      toast({ title: 'Error', description: reportsError, variant: 'destructive' });
    }
  }, [reportsError]);

  useEffect(() => {
    if (selectedMember) {
      fetchBalance(selectedMember.teamMemberId);
      setGridRefreshKey((k) => k + 1);
    }
  }, [selectedMember?.teamMemberId]);

  const handleEntrySuccess = () => {
    setGridRefreshKey((k) => k + 1);
    if (selectedMember) fetchBalance(selectedMember.teamMemberId);
  };

  return (
    <div className="space-y-6">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Supervisor — Compensatory Time</ToolbarPageTitle>
          <ToolbarDescription>Record and review compensatory time for your team</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Card>
        <CardContent className="pt-6">
          <CardTitle className="flex items-center gap-2 mb-4">
            Select Team Member
          </CardTitle>
          <div className="max-w-sm">
            <TeamMemberSelector
              reports={reports}
              loading={reportsLoading}
              selectedTeamMemberId={selectedMember?.teamMemberId ?? null}
              onSelect={setSelectedMember}
            />
          </div>
        </CardContent>
      </Card>

      {selectedMember && (
        <>
          {balance && (
            <div className="flex flex-wrap gap-3 px-1">
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                Earned: {balance.earnedHours.toFixed(2)}h
              </span>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800">
                Used: {balance.usedHours.toFixed(2)}h
              </span>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                Pending: {balance.pendingHours.toFixed(2)}h
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                Balance: {balance.balanceHours.toFixed(2)}h
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Night multiplier: {balance.nightMultiplier}×
              </span>
            </div>
          )}

          <Tabs defaultValue="intake">
            <TabsList>
              <TabsTrigger value="intake">Record Intake (Earned)</TabsTrigger>
              <TabsTrigger value="usage">Record Usage (Used)</TabsTrigger>
            </TabsList>

            <TabsContent value="intake" className="mt-4">
              <IntakeEntryForm
                teamMemberId={selectedMember.teamMemberId}
                projects={projects}
                projectsLoading={projectsLoading}
                onSuccess={handleEntrySuccess}
              />
            </TabsContent>

            <TabsContent value="usage" className="mt-4">
              <UsageEntryForm
                teamMemberId={selectedMember.teamMemberId}
                projects={projects}
                projectsLoading={projectsLoading}
                onSuccess={handleEntrySuccess}
              />
              <div className="mt-6">
                <ShiftsView
                  teamMemberId={selectedMember.teamMemberId}
                  projects={projects}
                />
              </div>
            </TabsContent>
          </Tabs>

          <SupervisorCompTimeGrid
            teamMemberId={selectedMember.teamMemberId}
            refreshKey={gridRefreshKey}
          />
        </>
      )}
    </div>
  );
}
