import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { TimeOffWithTeamMemberDTO, TimeOffWithDetailsDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useAllTeamTimeOffs,
  useSupervisorTimeOffOperations,
} from '@/hooks/useSupervisorTimeOff';
import { TimeOffManagementGrid } from './components/TimeOffManagementGrid';
import { CancelTimeOffDialog } from '../supervisor/components/CancelTimeOffDialog';
import { EditSupervisorTimeOffDialog } from '../supervisor/components/EditSupervisorTimeOffDialog';

/**
 * Convert TimeOffWithTeamMemberDTO to TimeOffWithDetailsDTO for dialogs
 */
function toTimeOffWithDetails(timeOff: TimeOffWithTeamMemberDTO): TimeOffWithDetailsDTO {
  return {
    timeOffId: timeOff.timeOffId,
    timeOffStartDate: timeOff.timeOffStartDate,
    timeOffEndDate: timeOff.timeOffEndDate,
    timeOffDays: timeOff.timeOffDays,
    timeOffOriginalId: null,
    categoryId: timeOff.categoryId,
    categoryName: timeOff.categoryName,
    statusId: timeOff.statusId,
    statusName: timeOff.statusName,
  };
}

/**
 * Create a minimal SupervisedTeamMemberDTO from TimeOffWithTeamMemberDTO for edit dialog
 */
function toSupervisedTeamMember(timeOff: TimeOffWithTeamMemberDTO): SupervisedTeamMemberDTO {
  return {
    teamMemberId: timeOff.teamMemberId,
    workdayId: timeOff.workdayId,
    teamMemberNames: '',
    teamMemberSurnames: '',
    teamMemberKnownAs: null,
    teamMemberFullName: timeOff.teamMemberFullName,
    teamMemberSeniority: '',
    primaryRoleName: null,
    countryId: null,
    countryName: null,
    countryIso: timeOff.countryIso,
    reportType: 'Direct',
    reportLevel: timeOff.reportLevel,
    supervisorAssignmentStartDate: new Date(),
    supervisorAssignmentEndDate: null,
    teamMemberEndDate: timeOff.teamMemberEndDate,
  };
}

export function TimeOffManagementPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState<TimeOffWithTeamMemberDTO | null>(null);

  // Hooks
  const timeOffsHook = useAllTeamTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const operationsHook = useSupervisorTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  // Load time-offs on mount
  useEffect(() => {
    timeOffsHook.loadTimeOffs();
  }, []);

  // Get existing time-offs for the selected team member (for overlap detection in edit dialog)
  const existingTimeOffsForMember = useMemo<TimeOffWithDetailsDTO[]>(() => {
    if (!selectedTimeOff) return [];
    return timeOffsHook.timeOffs
      .filter((t) => t.teamMemberId === selectedTimeOff.teamMemberId)
      .map(toTimeOffWithDetails);
  }, [timeOffsHook.timeOffs, selectedTimeOff]);

  // Handlers
  const handleEditClick = useCallback((timeOff: TimeOffWithTeamMemberDTO) => {
    setSelectedTimeOff(timeOff);
    setEditDialogOpen(true);
  }, []);

  const handleRowClick = useCallback((timeOff: TimeOffWithTeamMemberDTO) => {
    navigate(`/timeoff-detail/${timeOff.timeOffId}?from=/timeoff-management`);
  }, [navigate]);

  const handleCancelClick = useCallback((timeOff: TimeOffWithTeamMemberDTO) => {
    setSelectedTimeOff(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      timeOffsHook.refreshTimeOffs();
    },
    [operationsHook, timeOffsHook]
  );

  const handleConfirmEdit = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      timeOffsHook.refreshTimeOffs();
    },
    [operationsHook, timeOffsHook]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Time Off Review</ToolbarPageTitle>
          <ToolbarDescription>
            Review the time off of your org
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 space-y-4">
        {/* Show Cancelled Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-cancelled"
            checked={showCancelled}
            onCheckedChange={(checked) => setShowCancelled(checked === true)}
          />
          <Label
            htmlFor="show-cancelled"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show all cancelled
          </Label>
        </div>

        {/* Time Off Grid */}
        <TimeOffManagementGrid
          timeOffs={timeOffsHook.timeOffs}
          loading={timeOffsHook.loading}
          showCancelled={showCancelled}
          onRowClick={handleRowClick}
          onEditClick={handleEditClick}
          onCancelClick={handleCancelClick}
        />
      </div>

      {/* Cancel Dialog */}
      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={selectedTimeOff ? toTimeOffWithDetails(selectedTimeOff) : null}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

      {/* Edit Dialog */}
      <EditSupervisorTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOff={selectedTimeOff ? toTimeOffWithDetails(selectedTimeOff) : null}
        teamMember={selectedTimeOff ? toSupervisedTeamMember(selectedTimeOff) : null}
        existingTimeOffs={existingTimeOffsForMember}
        onConfirm={handleConfirmEdit}
        loading={operationsHook.loading}
      />
    </div>
  );
}
