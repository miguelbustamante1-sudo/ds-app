import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useTeamMemberTimeOffs,
  useSupervisorTimeOffOperations,
  useTeamMemberWorkdayBalance,
} from '@/hooks/useSupervisorTimeOff';
import { apiGet } from '@/lib/api';
import { WorkdayBalanceBadges } from '../../components/WorkdayBalanceBadges';
import { SupervisorTimeOffList } from '../../supervisor/components/SupervisorTimeOffList';
import { CancelTimeOffDialog } from '../../supervisor/components/CancelTimeOffDialog';
import { SupervisorMemberForm } from './SupervisorMemberForm';

export function SupervisorMemberDetailPage() {
  const { teamMemberId: teamMemberIdParam } = useParams<{ teamMemberId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const teamMemberId = Number(teamMemberIdParam);

  const [teamMember, setTeamMember] = useState<TeamMemberReportDTO | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffWithDetailsDTO | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const timeOffsHook = useTeamMemberTimeOffs({
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });
  const operationsHook = useSupervisorTimeOffOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });
  const balanceHook = useTeamMemberWorkdayBalance();

  useEffect(() => {
    if (!teamMemberId) return;
    apiGet<TeamMemberReportDTO[]>('/api/team-members/my-reports?hierarchy=complete')
      .then((reports) => {
        const found = reports.find((r) => r.teamMemberId === teamMemberId) ?? null;
        setTeamMember(found);
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load team member', variant: 'destructive' }));
    timeOffsHook.loadTimeOffs(teamMemberId);
    balanceHook.loadBalance(teamMemberId);
  }, [teamMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setEditingTimeOff(timeOff);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCancelEdit = useCallback(() => setEditingTimeOff(null), []);

  const handleCreate = useCallback(async (data: CreateSupervisorTimeOffDTO) => {
    await operationsHook.createTimeOff(data);
    timeOffsHook.loadTimeOffs(teamMemberId);
    balanceHook.loadBalance(teamMemberId);
  }, [operationsHook, timeOffsHook, balanceHook, teamMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSplitSuccess = useCallback(() => {
    timeOffsHook.loadTimeOffs(teamMemberId);
    balanceHook.loadBalance(teamMemberId);
  }, [timeOffsHook, balanceHook, teamMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback(async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
    await operationsHook.updateTimeOff(timeOffId, data);
    setEditingTimeOff(null);
    timeOffsHook.loadTimeOffs(teamMemberId);
    balanceHook.loadBalance(teamMemberId);
  }, [operationsHook, timeOffsHook, balanceHook, teamMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(async (timeOffId: number, comment: string) => {
    await operationsHook.cancelTimeOff(timeOffId, comment);
    timeOffsHook.loadTimeOffs(teamMemberId);
    balanceHook.loadBalance(teamMemberId);
  }, [operationsHook, timeOffsHook, balanceHook, teamMemberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberName = teamMember
    ? `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`
    : '...';

  // TeamMemberReportDTO satisfies SupervisedTeamMemberDTO structurally except for hireDate
  const memberForForm = teamMember
    ? ({ ...teamMember, hireDate: null } as SupervisedTeamMemberDTO)
    : null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/supervisor-time-off-v2')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>{memberName}</ToolbarPageTitle>
              <ToolbarDescription>
                {teamMember?.workdayId ?? ''}{teamMember?.countryIso ? ` · ${teamMember.countryIso}` : ''}
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-4 mb-6">
        <WorkdayBalanceBadges
          vacation={balanceHook.balance?.vacation ?? 0}
          personalDays={balanceHook.balance?.personalDays ?? 0}
          loading={balanceHook.loading}
          countryIso={teamMember?.countryIso ?? null}
        />
      </div>

      {memberForForm && (
        <div ref={formRef} className="mb-8">
          <SupervisorMemberForm
            teamMember={memberForForm}
            existingTimeOffs={timeOffsHook.timeOffs}
            editingTimeOff={editingTimeOff}
            onCancelEdit={handleCancelEdit}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onSplitSuccess={handleSplitSuccess}
            loading={operationsHook.loading}
            workdayBalance={balanceHook.balance}
          />
        </div>
      )}

      <SupervisorTimeOffList
        timeOffs={timeOffsHook.timeOffs}
        loading={timeOffsHook.loading}
        onEditClick={handleEditClick}
        onCancelClick={handleCancelClick}
        categoryMode="all"
        selectedTimeOffId={editingTimeOff?.timeOffId ?? null}
      />

      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />
    </div>
  );
}
