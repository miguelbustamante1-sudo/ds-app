import { useEffect, useState, useCallback } from 'react';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { useExceptionTeamMemberTimeOffs } from '@/hooks/useExceptionTimeOff';
import { useExceptionTimeOffOperations } from './hooks/useExceptionTimeOffOperations';
import { ExceptionCancelTimeOffDialog } from './components/ExceptionCancelTimeOffDialog';
import { ExceptionTimeOffList } from './components/ExceptionTimeOffList';
import { ExceptionTimeOffForm } from './components/ExceptionTimeOffForm';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { apiGet, ApiError } from '@/lib/api';

export function TimeOffExceptionPage() {
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberDTO | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffWithDetailsDTO | null>(null);

  const [actingAsUsers, setActingAsUsers] = useState<ActingAsUserDTO[]>([]);
  const [actingAsUserId, setActingAsUserId] = useState<number | null>(null);

  const timeOffsHook = useExceptionTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operationsHook = useExceptionTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    async function loadAllTeamMembers() {
      try {
        setLoadingTeamMembers(true);
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        setTeamMembers(data);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load team members';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingTeamMembers(false);
      }
    }
    loadAllTeamMembers();
  }, []);

  useEffect(() => {
    async function loadActingAsUsers() {
      try {
        const data = await apiGet<ActingAsUserDTO[]>('/api/time-offs/exception/acting-as-users');
        setActingAsUsers(data);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load acting-as users';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    }
    loadActingAsUsers();
  }, []);

  useEffect(() => {
    if (selectedTeamMember) {
      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    } else {
      timeOffsHook.clearTimeOffs();
    }
  }, [selectedTeamMember]);

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`,
  }));

  const actingAsOptions: ComboBoxOption[] = actingAsUsers.map((u) => ({
    value: u.userId.toString(),
    label: u.workdayId ? `${u.fullName} (${u.workdayId})` : u.fullName,
  }));

  const handleSelectTeamMember = useCallback(
    (value: string) => {
      const found = teamMembers.find((m) => m.teamMemberId.toString() === value) ?? null;
      setSelectedTeamMember(found);
    },
    [teamMembers]
  );

  const handleSelectActingAs = useCallback(
    (value: string) => {
      setActingAsUserId(value ? Number(value) : null);
    },
    []
  );

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setEditingTimeOff(timeOff);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTimeOff(null);
  }, []);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      if (!actingAsUserId) return;
      await operationsHook.cancelTimeOff(timeOffId, comment, actingAsUserId);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook, actingAsUserId]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      if (!actingAsUserId) return;
      await operationsHook.createTimeOff(data, actingAsUserId);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook, actingAsUserId]
  );

  const handleUpdateTimeOff = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      if (!actingAsUserId) return;
      await operationsHook.updateTimeOff(timeOffId, data, actingAsUserId);
      setEditingTimeOff(null);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook, actingAsUserId]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Time Off Exception Entry</ToolbarPageTitle>
          <ToolbarDescription>
            Add time off entries without business rule restrictions (no SV/GT rules, no balance or notice period checks)
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="flex flex-wrap items-center gap-4 mt-6">
        <div className="w-72 shrink-0">
          <ComboBox
            options={teamMemberOptions}
            value={selectedTeamMember?.teamMemberId.toString() ?? ''}
            onValueChange={handleSelectTeamMember}
            placeholder={loadingTeamMembers ? 'Loading...' : 'Select team member'}
            searchPlaceholder="Search team members..."
            emptyMessage="No team members found."
            disabled={loadingTeamMembers}
          />
        </div>
        <div className="w-72 shrink-0">
          <ComboBox
            options={actingAsOptions}
            value={actingAsUserId?.toString() ?? ''}
            onValueChange={handleSelectActingAs}
            placeholder="Acting as..."
            searchPlaceholder="Search users..."
            emptyMessage="No users found."
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
            <ExceptionTimeOffForm
              teamMember={selectedTeamMember}
              existingTimeOffs={timeOffsHook.timeOffs}
              onSubmit={handleCreateTimeOff}
              onUpdate={handleUpdateTimeOff}
              onCancelEdit={handleCancelEdit}
              editingTimeOff={editingTimeOff}
              loading={operationsHook.loading}
              disabled={!actingAsUserId}
            />
            <ExceptionTimeOffList
              timeOffs={timeOffsHook.timeOffs}
              loading={timeOffsHook.loading}
              onEditClick={handleEditClick}
              onCancelClick={handleCancelClick}
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to create an exception entry
          </div>
        )}
      </div>

      <ExceptionCancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />
    </div>
  );
}
