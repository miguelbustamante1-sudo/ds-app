import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimeOffWithDetailsDTO } from '../../../../shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { useMyTimeOffOperations } from '@/hooks/useMyTimeOffOperations';
import { useMyWorkdayBalance } from '@/hooks/useMyWorkdayBalance';
import { HolidayProvider } from './context/HolidayContext';
import { MyTimeOffList } from './components/MyTimeOffList';
import { TimeOffRequestForm } from './components/TimeOffRequestForm';
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
    navigate(`/my-time-off/edit/${timeOff.timeOffId}`);
  }, [navigate]);

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
      </Toolbar>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Off List - 2/3 width on large screens */}
        <div className="lg:col-span-2">
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

        {/* Request Form - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <TimeOffRequestForm
            existingTimeOffs={timeOffs}
            onSuccess={handleSuccess}
            workdayBalance={balance}
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

    </div>
    </HolidayProvider>
  );
}
