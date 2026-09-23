import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimeOffWithDetailsDTO } from '../../../../shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ListChecks, Clock, CalendarCheck2, CalendarHeart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { useMyTimeOffOperations } from '@/hooks/useMyTimeOffOperations';
import { useMyWorkdayBalance } from '@/hooks/useMyWorkdayBalance';
import { HolidayProvider } from './context/HolidayContext';
import { MyTimeOffList } from './components/MyTimeOffList';
import { TimeOffRequestForm } from './components/TimeOffRequestForm';
import { EditTimeOffPageInner } from './edit';
import { CancelMyTimeOffDialog } from './components/CancelMyTimeOffDialog';
import { BackToHubButton } from '@/components/BackToHubButton';

interface MyTeamMemberProfile {
  teamMemberId: number;
  teamMemberStartDate: string | null;
  teamMemberEndDate: string | null;
  countryId: number | null;
  countryIso: string | null;
  hireDate: string | null;
}

type FormMode = 'create' | 'edit' | null;

export function MyTimeOffPage() {
  const navigate = useNavigate();

  const [timeOffs, setTimeOffs] = useState<TimeOffWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyTeamMemberProfile | null>(null);
  const { toast } = useToast();
  const { balance, loading: balanceLoading, refetchBalance } = useMyWorkdayBalance();

  // Panel state — replaces the old requestDialogOpen/editDialogOpen booleans
  const [formMode, setFormMode] = useState<FormMode>(null);
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
    apiGet<MyTeamMemberProfile>('/api/team-members/me')
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleSuccess = useCallback(() => {
    loadTimeOffs();
    refetchBalance();
  }, [loadTimeOffs, refetchBalance]);

  const closePanel = useCallback(() => {
    setFormMode(null);
    setEditingTimeOffId(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    handleSuccess();
    closePanel();
  }, [handleSuccess, closePanel]);

  const handleEditClose = useCallback(() => {
    handleSuccess();
    closePanel();
  }, [handleSuccess, closePanel]);

  // Action handlers
  const handleRowClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    navigate(`/timeoff-detail/${timeOff.timeOffId}`);
  }, [navigate]);

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setEditingTimeOffId(timeOff.timeOffId);
    setFormMode('edit');
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

  // Summary card stats — derived entirely from data already loaded on this page
  const totalRequests = useMemo(
    () => timeOffs.filter((t) => !t.statusName.toLowerCase().includes('cancelled')).length,
    [timeOffs]
  );
  const pendingRequests = useMemo(
    () =>
      timeOffs.filter((t) => {
        const s = t.statusName.toLowerCase();
        return s.includes('pending') || s.includes('tentative');
      }).length,
    [timeOffs]
  );

  return (
    <HolidayProvider countryId={profile?.countryId ?? null} countryIso={profile?.countryIso ?? null}>
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>My Time Off</ToolbarPageTitle>
          <ToolbarDescription>View and request time off</ToolbarDescription>
        </ToolbarHeading>
        <div className="flex items-center gap-2">
          <BackToHubButton hubPath="/self-service-hub" />
          {formMode === null && (
            <Button onClick={() => setFormMode('create')} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Request Time Off
            </Button>
          )}
        </div>
      </Toolbar>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Requests</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '—' : totalRequests}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Requests</span>
            </div>
            <p className={`text-2xl font-bold ${pendingRequests > 0 ? 'text-warning' : 'text-foreground'}`}>
              {loading ? '—' : pendingRequests}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vacation Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {balanceLoading ? '—' : (balance?.vacation ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarHeart className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Days Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {balanceLoading ? '—' : (balance?.personalDays ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inline create/edit panel */}
      {formMode === 'create' && (
        <div className="mb-6">
          <TimeOffRequestForm
            existingTimeOffs={timeOffs}
            onSuccess={handleCreateSuccess}
            onCancel={closePanel}
          />
        </div>
      )}
      {formMode === 'edit' && (
        <div className="mb-6">
          <EditTimeOffPageInner
            timeOffId={editingTimeOffId}
            profile={profile}
            isModal
            onClose={handleEditClose}
          />
        </div>
      )}

      <div>
        <MyTimeOffList
          timeOffs={timeOffs}
          loading={loading}
          balance={balance}
          balanceLoading={balanceLoading}
          countryIso={profile?.countryIso ?? null}
          onEditClick={handleEditClick}
          onCancelClick={handleCancelClick}
          onRowClick={handleRowClick}
        />
      </div>

      <CancelMyTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={selectedTimeOff}
        sibling={
          selectedTimeOff?.timeOffOriginalId
            ? timeOffs.find(
                (t) => t.timeOffOriginalId === selectedTimeOff.timeOffOriginalId && t.timeOffId !== selectedTimeOff.timeOffId
              ) ?? null
            : null
        }
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

    </div>
    </HolidayProvider>
  );
}
