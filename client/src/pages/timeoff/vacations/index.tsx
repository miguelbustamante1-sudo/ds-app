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
} from '@/hooks/useSupervisorTimeOff';
import { TeamMembersDataGrid } from '../supervisor/components/TeamMembersDataGrid';
import { SupervisorTimeOffList } from '../supervisor/components/SupervisorTimeOffList';
import { SupervisorTimeOffForm } from '../supervisor/components/SupervisorTimeOffForm';
import { CancelTimeOffDialog } from '../supervisor/components/CancelTimeOffDialog';
import { EditSupervisorTimeOffDialog } from '../supervisor/components/EditSupervisorTimeOffDialog';

export function SupervisorVacationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberReportDTO | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [timeOffToEdit, setTimeOffToEdit] = useState<TimeOffWithDetailsDTO | null>(null);

  const teamMembersHook = useMyTeamMembers({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const timeOffsHook = useTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operationsHook = useSupervisorTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Éxito', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => { teamMembersHook.loadTeamMembers(); }, []);

  useEffect(() => {
    if (selectedTeamMember) {
      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    } else {
      timeOffsHook.clearTimeOffs();
    }
  }, [selectedTeamMember]);

  const handleSelectTeamMember = useCallback((tm: TeamMemberReportDTO) => {
    setSelectedTeamMember(tm);
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
      if (selectedTeamMember) timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleConfirmEdit = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      if (selectedTeamMember) timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      await operationsHook.createTimeOff(data);
      if (selectedTeamMember) timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Supervisor Vacaciones</ToolbarPageTitle>
          <ToolbarDescription>
            Ver y gestionar solicitudes de vacaciones de tu equipo
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

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
            <span className="text-lg font-semibold">
              {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
            </span>
            <span className="text-muted-foreground">WDID: {selectedTeamMember.workdayId}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <SupervisorTimeOffForm
              teamMember={selectedTeamMember}
              existingTimeOffs={timeOffsHook.timeOffs}
              onSubmit={handleCreateTimeOff}
              loading={operationsHook.loading}
              categoryMode="vacation-only"
            />
            <SupervisorTimeOffList
              timeOffs={timeOffsHook.timeOffs}
              loading={timeOffsHook.loading}
              onEditClick={handleEditClick}
              onCancelClick={handleCancelClick}
              onRowClick={handleRowClick}
              categoryMode="vacation-only"
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Selecciona un miembro del equipo para ver sus vacaciones
          </div>
        )}
      </div>

      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

      <EditSupervisorTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOff={timeOffToEdit}
        teamMember={selectedTeamMember}
        existingTimeOffs={timeOffsHook.timeOffs}
        onConfirm={handleConfirmEdit}
        loading={operationsHook.loading}
        categoryMode="vacation-only"
      />
    </div>
  );
}
