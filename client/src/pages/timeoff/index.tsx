import { useEffect, useState, useCallback } from 'react';
import type { TimeOffWithDetailsDTO, UpdateMyTimeOffDTO } from '../../../../shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { useMyTimeOffOperations } from '@/hooks/useMyTimeOffOperations';
import { MyTimeOffList } from './components/MyTimeOffList';
import { TimeOffRequestForm } from './components/TimeOffRequestForm';
import { CancelMyTimeOffDialog } from './components/CancelMyTimeOffDialog';
import { EditTimeOffDialog } from './components/EditTimeOffDialog';

export function MyTimeOffPage() {
  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState<TimeOffWithDetailsDTO | null>(null);

  // Operations hook
  const operationsHook = useMyTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const loadTimeOffs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<TimeOffWithDetailsDTO[]>('/api/time-offs/my-requests');
      setTimeOffs(data);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to load time off requests';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTimeOffs();
  }, [loadTimeOffs]);

  const handleSuccess = useCallback(() => {
    loadTimeOffs();
  }, [loadTimeOffs]);

  // Action handlers
  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setSelectedTimeOff(timeOff);
    setEditDialogOpen(true);
  }, []);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setSelectedTimeOff(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      loadTimeOffs();
    },
    [operationsHook, loadTimeOffs]
  );

  const handleConfirmEdit = useCallback(
    async (timeOffId: number, data: UpdateMyTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      loadTimeOffs();
    },
    [operationsHook, loadTimeOffs]
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>My Time Off</ToolbarPageTitle>
          <ToolbarDescription>View and request time off</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Off List - 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <MyTimeOffList
            timeOffs={timeOffs}
            loading={loading}
            onEditClick={handleEditClick}
            onCancelClick={handleCancelClick}
          />
        </div>

        {/* Request Form - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <TimeOffRequestForm
            existingTimeOffs={timeOffs}
            onSuccess={handleSuccess}
          />
        </div>
      </div>

      {/* Cancel Dialog */}
      <CancelMyTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={selectedTimeOff}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

      {/* Edit Dialog */}
      <EditTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOff={selectedTimeOff}
        existingTimeOffs={timeOffs}
        onConfirm={handleConfirmEdit}
        loading={operationsHook.loading}
      />
    </div>
  );
}
