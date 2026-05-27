import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { TimeOffWithTeamMemberDTO, TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
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

export function TimeOffManagementPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [showCancelled, setShowCancelled] = useState(() => {
    return sessionStorage.getItem('timeoff-mgmt-show-cancelled') === 'true';
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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

  const handleEditClick = useCallback((timeOff: TimeOffWithTeamMemberDTO) => {
    navigate(`/supervisor-time-off/edit/${timeOff.timeOffId}?teamMemberId=${timeOff.teamMemberId}`);
  }, [navigate]);

  const handleRowClick = useCallback((timeOff: TimeOffWithTeamMemberDTO) => {
    navigate(`/timeoff-detail/${timeOff.timeOffId}?from=/time-off-management`);
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
            onCheckedChange={(checked) => {
              const value = checked === true;
              setShowCancelled(value);
              sessionStorage.setItem('timeoff-mgmt-show-cancelled', String(value));
            }}
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

    </div>
  );
}
