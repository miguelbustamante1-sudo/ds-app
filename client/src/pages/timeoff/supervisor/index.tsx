import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Users, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useMyTeamMembers,
  useTeamMemberTimeOffs,
  useSupervisorTimeOffOperations,
  useTeamMemberWorkdayBalance,
} from '@/hooks/useSupervisorTimeOff';
import { usePendingRequests } from '@/pages/my-team/pending-requests/hooks/usePendingRequests';
import { WorkdayBalanceBadges } from '../components/WorkdayBalanceBadges';
import { TeamMembersDataGrid } from './components/TeamMembersDataGrid';
import { SupervisorTimeOffList } from './components/SupervisorTimeOffList';
import { SupervisorTimeOffForm } from './components/SupervisorTimeOffForm';
import { CancelTimeOffDialog } from './components/CancelTimeOffDialog';
import { TimeOffDetailPanel } from './components/TimeOffDetailPanel';

export function SupervisorTimeOffPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Team members state
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberReportDTO | null>(null);
  // Selected time off for detail panel
  const [selectedTimeOffId, setSelectedTimeOffId] = useState<number | null>(null);
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);

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
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const pendingHook = usePendingRequests();
  useEffect(() => { pendingHook.loadRequests(); }, []);

  const pendingTimeOffCount = useMemo(
    () => pendingHook.requests.filter((r) => r.type === 'TimeOff').length,
    [pendingHook.requests]
  );

  // Flag members whose Workday balance appears negative (discrepancy indicator)
  const balanceDiscrepancyFlag = useMemo(() => {
    const b = balanceHook.balance;
    if (!b) return false;
    return b.vacation < 0 || b.personalDays < 0;
  }, [balanceHook.balance]);

  // Load team members on mount
  useEffect(() => {
    teamMembersHook.loadTeamMembers();
  }, []);

  // Load time-offs and balance when team member is selected
  useEffect(() => {
    setSelectedTimeOffId(null);
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
    setSelectedTimeOffId((prev) => prev === timeOff.timeOffId ? null : timeOff.timeOffId);
  }, []);

  useEffect(() => {
    if (selectedTimeOffId !== null) {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedTimeOffId]);

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    navigate(`/supervisor-time-off/edit/${timeOff.timeOffId}?teamMemberId=${timeOff.teamMemberId}`);
  }, [navigate]);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
        balanceHook.loadBalance(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook, balanceHook]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      await operationsHook.createTimeOff(data);
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
        balanceHook.loadBalance(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook, balanceHook]
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Size</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {teamMembersHook.loading ? '—' : teamMembersHook.teamMembers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Requests</span>
            </div>
            <p className={`text-2xl font-bold ${pendingTimeOffCount > 0 ? 'text-warning' : 'text-foreground'}`}>
              {pendingHook.loading ? '—' : pendingTimeOffCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {balanceDiscrepancyFlag
                ? <AlertCircle className="h-4 w-4 text-destructive" />
                : <CheckCircle className="h-4 w-4 text-success" />}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {selectedTeamMember ? 'Balance Status' : 'Workday Sync'}
              </span>
            </div>
            <p className={`text-sm font-semibold ${balanceDiscrepancyFlag ? 'text-destructive' : 'text-muted-foreground'}`}>
              {!selectedTeamMember
                ? 'Select member'
                : balanceHook.loading
                  ? '—'
                  : balanceDiscrepancyFlag
                    ? 'Discrepancy detected'
                    : 'OK'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">
              {selectedTeamMember
                ? `${selectedTeamMember.teamMemberNames} ${selectedTeamMember.teamMemberSurnames}`
                : 'None'}
            </p>
            {selectedTeamMember?.countryName && (
              <p className="text-xs text-muted-foreground truncate">{selectedTeamMember.countryName}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workday discrepancy alert — shown when negative balance detected */}
      {balanceDiscrepancyFlag && selectedTeamMember && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">Workday balance discrepancy detected</p>
            <p className="text-muted-foreground mt-0.5">
              {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames} has a negative vacation or personal-day balance. This may indicate a mismatch between Workday data and app records.
            </p>
          </div>
        </div>
      )}

      {/* Team Member Selector Bar */}
      <div className="flex items-center gap-4">
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
              countryIso={selectedTeamMember.countryIso}
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
              workdayBalance={balanceHook.balance}
            />
            <SupervisorTimeOffList
              timeOffs={timeOffsHook.timeOffs}
              loading={timeOffsHook.loading}
              onEditClick={handleEditClick}
              onCancelClick={handleCancelClick}
              onRowClick={handleRowClick}
              categoryMode="all"
              selectedTimeOffId={selectedTimeOffId}
            />
            {selectedTimeOffId && (
              <div ref={detailPanelRef} className="bg-card rounded-lg border p-4">
                <h3 className="text-base font-semibold mb-4">Time Off Detail #{selectedTimeOffId}</h3>
                <TimeOffDetailPanel
                  timeOffId={selectedTimeOffId}
                  onActionComplete={() => {
                    if (selectedTeamMember) {
                      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
                      balanceHook.loadBalance(selectedTeamMember.teamMemberId);
                    }
                  }}
                />
              </div>
            )}
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
        sibling={
          timeOffToCancel?.timeOffOriginalId
            ? timeOffsHook.timeOffs.find(
                (t) => t.timeOffOriginalId === timeOffToCancel.timeOffOriginalId && t.timeOffId !== timeOffToCancel.timeOffId
              ) ?? null
            : null
        }
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

    </div>
  );
}
