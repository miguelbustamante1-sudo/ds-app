import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimeOffWithDetailsDTO } from '../../../../shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { useMyTimeOffOperations } from '@/hooks/useMyTimeOffOperations';
import { useMyWorkdayBalance } from '@/hooks/useMyWorkdayBalance';
import { HolidayProvider } from './context/HolidayContext';
import { MyTimeOffList } from './components/MyTimeOffList';
import { TimeOffRequestDialog } from './components/TimeOffRequestDialog';
import { EditTimeOffDialog } from './edit/EditTimeOffDialog';
import { CancelMyTimeOffDialog } from './components/CancelMyTimeOffDialog';


export function MyTimeOffPage() {
  const navigate = useNavigate();

  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryIso, setCountryIso] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const { toast } = useToast();
  const { balance, loading: balanceLoading, refetchBalance } = useMyWorkdayBalance();

  // Dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTimeOffId, setEditingTimeOffId] = useState<number | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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

  useEffect(() => {
    apiGet<{ countryIso: string; countryId: number }>('/api/team-members/me')
      .then((profile) => {
        setCountryIso(profile.countryIso);
        setCountryId(profile.countryId);
      })
      .catch(() => {});
  }, []);

  const handleSuccess = useCallback(() => {
    loadTimeOffs();
    refetchBalance();
  }, [loadTimeOffs, refetchBalance]);

  // Action handlers
  const handleRowClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    navigate(`/timeoff-detail/${timeOff.timeOffId}`);
  }, [navigate]);

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setEditingTimeOffId(timeOff.timeOffId);
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
      refetchBalance();
    },
    [operationsHook, loadTimeOffs, refetchBalance]
  );

  return (
    <HolidayProvider countryId={countryId} countryIso={countryIso}>
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>My Time Off</ToolbarPageTitle>
          <ToolbarDescription>View and request time off</ToolbarDescription>
        </ToolbarHeading>
        <Button onClick={() => setRequestDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Request Time Off
        </Button>
      </Toolbar>

      <div className="mt-6">
        <MyTimeOffList
          timeOffs={timeOffs}
          loading={loading}
          balance={balance}
          balanceLoading={balanceLoading}
          countryIso={countryIso}
          onEditClick={handleEditClick}
          onCancelClick={handleCancelClick}
          onRowClick={handleRowClick}
        />
      </div>

      <TimeOffRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        existingTimeOffs={timeOffs}
        workdayBalance={balance}
        onSuccess={handleSuccess}
      />

      <EditTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOffId={editingTimeOffId}
        onSuccess={handleSuccess}
      />

      <CancelMyTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={selectedTimeOff}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

    </div>
    </HolidayProvider>
  );
}
