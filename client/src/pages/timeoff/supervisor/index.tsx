import { useEffect, useState, useCallback } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { SupervisedTeamMemberDTO } from '@shared/dto/SupervisedTeamMember';
import type { TimeOffWithDetailsDTO, CreateSupervisorTimeOffDTO, UpdateSupervisorTimeOffDTO } from '@shared/dto/TimeOff';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useMyTeamMembers,
  useTeamMemberTimeOffs,
  useSupervisorTimeOffOperations,
} from '@/hooks/useSupervisorTimeOff';
import { TeamMembersDataGrid } from './components/TeamMembersDataGrid';
import { SupervisorTimeOffList } from './components/SupervisorTimeOffList';
import { SupervisorTimeOffForm } from './components/SupervisorTimeOffForm';
import { CancelTimeOffDialog } from './components/CancelTimeOffDialog';
import { EditSupervisorTimeOffDialog } from './components/EditSupervisorTimeOffDialog';

export function SupervisorTimeOffPage() {
  const { toast } = useToast();

  // Team members state
  const [selectedTeamMember, setSelectedTeamMember] = useState<SupervisedTeamMemberDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [timeOffToCancel, setTimeOffToCancel] = useState<TimeOffWithDetailsDTO | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [timeOffToEdit, setTimeOffToEdit] = useState<TimeOffWithDetailsDTO | null>(null);

  // Mobile drawer state
  const [teamMemberDrawerOpen, setTeamMemberDrawerOpen] = useState(false);

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

  // Load team members on mount
  useEffect(() => {
    teamMembersHook.loadTeamMembers();
  }, []);

  // Load time-offs when team member is selected
  useEffect(() => {
    if (selectedTeamMember) {
      timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
    } else {
      timeOffsHook.clearTimeOffs();
    }
  }, [selectedTeamMember]);

  // Handlers
  const handleSelectTeamMember = useCallback((teamMember: SupervisedTeamMemberDTO) => {
    setSelectedTeamMember(teamMember);
    setTeamMemberDrawerOpen(false); // Close drawer on mobile when team member is selected
  }, []);

  const handleEditClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToEdit(timeOff);
    setEditDialogOpen(true);
  }, []);

  const handleCancelClick = useCallback((timeOff: TimeOffWithDetailsDTO) => {
    setTimeOffToCancel(timeOff);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(
    async (timeOffId: number, comment: string) => {
      await operationsHook.cancelTimeOff(timeOffId, comment);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleConfirmEdit = useCallback(
    async (timeOffId: number, data: UpdateSupervisorTimeOffDTO) => {
      await operationsHook.updateTimeOff(timeOffId, data);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
  );

  const handleCreateTimeOff = useCallback(
    async (data: CreateSupervisorTimeOffDTO) => {
      await operationsHook.createTimeOff(data);
      // Refresh time-offs list
      if (selectedTeamMember) {
        timeOffsHook.loadTimeOffs(selectedTeamMember.teamMemberId);
      }
    },
    [operationsHook, selectedTeamMember, timeOffsHook]
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

      {/* Main Layout - Horizontal Split */}
      <div className="flex gap-6 mt-6">
        {/* Left Side - Main Content (75%) */}
        <div className="flex-1 min-w-0">
          {selectedTeamMember ? (
            <div className="flex flex-col gap-6">
              {/* Selected Team Member Header */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{selectedTeamMember.teamMemberFullName}</h2>
                <span className="text-muted-foreground">WDID: {selectedTeamMember.workdayId}</span>
              </div>

              {/* Time Off List */}
              <SupervisorTimeOffList
                timeOffs={timeOffsHook.timeOffs}
                loading={timeOffsHook.loading}
                onEditClick={handleEditClick}
                onCancelClick={handleCancelClick}
              />

              {/* New Time Off Request Form */}
              <SupervisorTimeOffForm
                teamMember={selectedTeamMember}
                existingTimeOffs={timeOffsHook.timeOffs}
                onSubmit={handleCreateTimeOff}
                loading={operationsHook.loading}
              />
            </div>
          ) : (
            <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
              Select a team member to view their time-off requests
            </div>
          )}
        </div>

        {/* Right Side - Team Members (25%) - Desktop only */}
        <div className="hidden lg:block w-1/4 min-w-[280px]">
          <div className="bg-card rounded-lg border p-4 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">Team Members</h3>
            <TeamMembersDataGrid
              teamMembers={teamMembersHook.teamMembers}
              loading={teamMembersHook.loading}
              selectedTeamMemberId={selectedTeamMember?.teamMemberId ?? null}
              onSelectTeamMember={handleSelectTeamMember}
              sorting={sorting}
              onSortingChange={setSorting}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Floating button to open team member drawer */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Sheet open={teamMemberDrawerOpen} onOpenChange={setTeamMemberDrawerOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Users className="h-5 w-5 mr-2" />
              Team Members
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Team Members</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <TeamMembersDataGrid
                teamMembers={teamMembersHook.teamMembers}
                loading={teamMembersHook.loading}
                selectedTeamMemberId={selectedTeamMember?.teamMemberId ?? null}
                onSelectTeamMember={handleSelectTeamMember}
                sorting={sorting}
                onSortingChange={setSorting}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Cancel Dialog */}
      <CancelTimeOffDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        timeOff={timeOffToCancel}
        onConfirm={handleConfirmCancel}
        loading={operationsHook.loading}
      />

      {/* Edit Dialog */}
      <EditSupervisorTimeOffDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeOff={timeOffToEdit}
        teamMember={selectedTeamMember}
        existingTimeOffs={timeOffsHook.timeOffs}
        onConfirm={handleConfirmEdit}
        loading={operationsHook.loading}
      />
    </div>
  );
}
