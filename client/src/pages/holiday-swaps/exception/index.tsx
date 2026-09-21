import { useEffect, useState, useCallback } from 'react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiGet, ApiError } from '@/lib/api';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { ExceptionSwapForm } from './components/ExceptionSwapForm';
import { ExceptionSwapList } from './components/ExceptionSwapList';
import { useExceptionTeamMemberSwaps } from './hooks/useExceptionTeamMemberSwaps';
import { useExceptionSwapOperations } from './hooks/useExceptionSwapOperations';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';

export function HolidaySwapExceptionPage() {
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberDTO | null>(null);

  const [actingAsUsers, setActingAsUsers] = useState<ActingAsUserDTO[]>([]);
  const [loadingActingAs, setLoadingActingAs] = useState(false);
  const [actingAsUserId, setActingAsUserId] = useState<number | null>(null);

  const swapsHook = useExceptionTeamMemberSwaps();

  const operationsHook = useExceptionSwapOperations({
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  // Load all active team members on mount
  useEffect(() => {
    async function load() {
      try {
        setLoadingTeamMembers(true);
        const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const active = data.filter((m) => {
          if (!m.teamMemberEndDate) return true;
          return parseUTCDateAsLocal(String(m.teamMemberEndDate)) >= today;
        });
        setTeamMembers(active);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load team members';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingTeamMembers(false);
      }
    }
    load();
  }, []);

  // Load acting-as users on mount
  useEffect(() => {
    async function load() {
      try {
        setLoadingActingAs(true);
        const data = await apiGet<ActingAsUserDTO[]>('/api/holiday-swaps/exception/acting-as-users');
        setActingAsUsers(data);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to load acting-as users';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoadingActingAs(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedTeamMember) {
      swapsHook.loadSwaps(selectedTeamMember.teamMemberId);
    } else {
      swapsHook.clearSwaps();
    }
  }, [selectedTeamMember]);

  const refresh = useCallback(() => {
    if (selectedTeamMember) {
      swapsHook.loadSwaps(selectedTeamMember.teamMemberId);
    }
  }, [selectedTeamMember, swapsHook]);

  const handleSelectTeamMember = useCallback(
    (value: string) => {
      const found = teamMembers.find((m) => m.teamMemberId.toString() === value) ?? null;
      setSelectedTeamMember(found);
    },
    [teamMembers]
  );

  const handleSelectActingAs = useCallback((value: string) => {
    setActingAsUserId(value ? Number(value) : null);
  }, []);

  const handleSubmit = useCallback(
    async (holidayId: number, replacementDate: string) => {
      if (!selectedTeamMember || !actingAsUserId) return;
      await operationsHook.createSwap(
        selectedTeamMember.teamMemberId,
        { holidayId, replacementDate },
        actingAsUserId
      );
      refresh();
    },
    [selectedTeamMember, actingAsUserId, operationsHook, refresh]
  );

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}${m.workdayId ? ` (${m.workdayId})` : ''}`,
  }));

  const actingAsOptions: ComboBoxOption[] = actingAsUsers.map((u) => ({
    value: u.userId.toString(),
    label: `${u.fullName}${u.workdayId ? ` (${u.workdayId})` : ''}`,
  }));

  const canOperate = selectedTeamMember !== null && actingAsUserId !== null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Holiday Swap Exception</ToolbarPageTitle>
          <ToolbarDescription>
            Create, edit, review, and cancel holiday swaps for any team member without date or status restrictions.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {/* Selectors */}
      <div className="mt-6 flex items-center gap-4 flex-wrap">
        <div className="w-80">
          <ComboBox
            options={teamMemberOptions}
            value={selectedTeamMember?.teamMemberId.toString() ?? ''}
            onValueChange={handleSelectTeamMember}
            placeholder={loadingTeamMembers ? 'Loading…' : 'Search team members…'}
          />
        </div>
        <div className="w-80">
          <ComboBox
            options={actingAsOptions}
            value={actingAsUserId?.toString() ?? ''}
            onValueChange={handleSelectActingAs}
            placeholder={loadingActingAs ? 'Loading…' : 'Acting as…'}
          />
        </div>
        {selectedTeamMember && (
          <span className="text-lg font-semibold">
            {selectedTeamMember.teamMemberNames} {selectedTeamMember.teamMemberSurnames}
            {selectedTeamMember.workdayId && (
              <span className="text-muted-foreground text-sm font-normal ml-2">
                {selectedTeamMember.workdayId}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6">
        {selectedTeamMember ? (
          <div className="flex flex-col gap-6">
            <ExceptionSwapForm
              countryId={selectedTeamMember.countryId ?? null}
              editingSwap={null}
              loading={operationsHook.loading}
              disabled={!canOperate}
              onSubmit={handleSubmit}
              onCancelEdit={() => {}}
            />
            <ExceptionSwapList
              swaps={swapsHook.swaps}
              loading={swapsHook.loading}
              actingAsUserId={actingAsUserId}
              disabled={!canOperate}
            />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
            Select a team member to manage their holiday swaps.
          </div>
        )}
      </div>
    </div>
  );
}
