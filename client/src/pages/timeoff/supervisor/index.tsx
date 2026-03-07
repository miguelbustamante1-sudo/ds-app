import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import {
  useMyTeamMembers,
  useTeamMemberTimeOffs,
  useSupervisorTimeOffOperations,
  useTeamMemberWorkdayBalance,
} from '@/hooks/useSupervisorTimeOff';
import { WorkdayBalanceBadges } from '../components/WorkdayBalanceBadges';
import { TeamMembersDataGrid } from './components/TeamMembersDataGrid';
import { SupervisorTimeOffList } from './components/SupervisorTimeOffList';
import { SupervisorTimeOffForm } from './components/SupervisorTimeOffForm';
import { CancelTimeOffDialog } from './components/CancelTimeOffDialog';
import { EditSupervisorTimeOffDialog } from './components/EditSupervisorTimeOffDialog';

export function SupervisorTimeOffPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Team members state
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberReportDTO | null>(null);
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [timeOffToEdit, setTimeOffToEdit] = useState<TimeOffWithDetailsDTO | null>(null);

  // Hooks
  const teamMembersHook = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const timeOffsHook = useTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operationsHook = useSupervisorTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const balanceHook = useTeamMemberWorkdayBalance();

  // Load team members on mount
  useEffect(() => {
    teamMembersHook.loadTeamMembers();
  }, []);

  // Load time-offs and balance when team member is selected
  useEffect(() => {
    if (selectedTeamMember) {
      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      balanceHook.loadBalance(selectedTeamMember.teamMemberId);
    } else {
      timeOffsHook.clearTimeOffs();
      balanceHook.clearBalance();
    }
  }, [selectedTeamMember]);

  // Handlers
  const handleSelectTeamMember = useCallback((teamMember: TeamMemberReportDTO) => {
    setSelectedTeamMember(teamMember);
  }, []);

  const handleRowClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    navigate(`/timeoff-detail/${timeOff.timeOffId}`);
  }, [navigate]);

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToEdit(timeOff);
    setEditDialogOpen(true);
  }, []);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleConfirmEdit = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      await operationsHook.createTimeOff(data);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Supervisor Time Off Management</ToolbarPageTitle>
          <ToolbarDescription>
            View and manage time off requests for your team members
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {/* Team Member Selector Bar */}
      <div className="flex items-center gap-4 mt-6">
        <div className="w-72 shrink-0">
          <TeamMembersDataGrid
            teamMembers={teamMembersHook.teamMembers}
            loading={teamMembersHook.loading}
            selectedTeamMemberId={selectedTeamMember?.teamMemberId ?? null}
            onSelectTeamMember={handleSelectTeamMember}
          />
        </div>
        {selectedTeamMember && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}</span>
            <span className="text-muted-foreground">WDID: {selectedTeamMember.workdayId}</span>
            <WorkdayBalanceBadges
              vacation={balanceHook.balance?.vacation ?? 0}
              personalDays={balanceHook.balance?.personalDays ?? 0}
              loading={balanceHook.loading}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <SupervisorTimeOffForm
              teamMember={selectedTeamMember}
              existingTimeOffs={timeOffsHook.timeOffs}
              onSubmit={handleCreateTimeOff}
              loading={operationsHook.loading}
              categoryMode="all"
            />
            <SupervisorTimeOffList
              timeOffs={timeOffsHook.timeOffs}
              loading={timeOffsHook.loading}
              onEditClick={handleEditClick}
              onCancelClick={handleCancelClick}
              onRowClick={handleRowClick}
              categoryMode="all"
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to view their time-off requests
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

      {/* Edit Dialog */}
      <EditSupervisorTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOff={timeOffToEdit}
        teamMember={selectedTeamMember}
        existingTimeOffs={timeOffsHook.timeOffs}
        onConfirm={handleConfirmEdit}
        loading={operationsHook.loading}
        categoryMode="all"
      />
    </div>
  );
}
