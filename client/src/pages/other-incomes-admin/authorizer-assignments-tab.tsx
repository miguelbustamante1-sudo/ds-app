import { useEffect, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import type { AuthorizerAssignmentDTO, CreateAuthorizerAssignmentDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatUTCDate } from '@/lib/utils';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TeamMemberOption {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

interface AssignmentFormData {
  teamMemberId: string;
  authorizerId: string;
  authorizerAssignmentStartDate: string;
}

export function AuthorizerAssignmentsTab() {
  const [items, setItems] = useState<AuthorizerAssignmentDTO[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<AuthorizerAssignmentDTO | null>(null);
  const { toast } = useToast();

  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    defaultValues: { teamMemberId: '', authorizerId: '', authorizerAssignmentStartDate: '' },
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet<AuthorizerAssignmentDTO[]>('/api/authorizer-assignments');
      setItems(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to load authorizer assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    apiGet<TeamMemberOption[]>('/api/team-members')
      .then(setTeamMembers)
      .catch(() => toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' }));
  }, []);

  const handleCreateClick = () => {
    reset({ teamMemberId: '', authorizerId: '', authorizerAssignmentStartDate: '' });
    setFormOpen(true);
  };

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      // The ComboBoxes still pick team members by internal id (for display/search
      // consistency with the rest of the app) — resolve to Workday IDs here, since
      // txa_authorizer_assignment keys on wdid, not tms_id.
      const teamMember = teamMembers.find((tm) => tm.teamMemberId.toString() === data.teamMemberId);
      const authorizer = teamMembers.find((tm) => tm.teamMemberId.toString() === data.authorizerId);
      if (!teamMember?.workdayId || !authorizer?.workdayId) {
        toast({
          title: 'Error',
          description: 'The selected team member or authorizer has no Workday ID on file',
          variant: 'destructive',
        });
        return;
      }

      const payload: CreateAuthorizerAssignmentDTO = {
        teamMemberWdid: teamMember.workdayId,
        authorizerWdid: authorizer.workdayId,
        authorizerAssignmentStartDate: data.authorizerAssignmentStartDate,
      };
      await apiPost<AuthorizerAssignmentDTO, CreateAuthorizerAssignmentDTO>('/api/authorizer-assignments', payload);
      toast({ title: 'Success', description: 'Authorizer assignment created' });
      setFormOpen(false);
      // Reassignment may have closed a prior row for this team member — reload the full list rather than patching in place.
      loadItems();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create assignment', variant: 'destructive' });
    }
  };

  const handleDeleteClick = (record: AuthorizerAssignmentDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await apiDelete(`/api/authorizer-assignments/${deletingRecord.authorizerAssignmentId}`);
      setItems((prev) => prev.filter((i) => i.authorizerAssignmentId !== deletingRecord.authorizerAssignmentId));
      toast({ title: 'Success', description: 'Authorizer assignment deleted' });
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete assignment', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const formatTeamMemberOption = (tm: TeamMemberOption) => {
    const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
    return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
  };

  const columns = useMemo<ColumnDef<AuthorizerAssignmentDTO>[]>(
    () => [
      {
        id: 'teamMember',
        accessorFn: (row) => formatTeamMemberOption(row.teamMember),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        size: 220,
      },
      {
        id: 'authorizer',
        accessorFn: (row) => formatTeamMemberOption(row.authorizer),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Authorizer" />,
        size: 220,
      },
      {
        accessorKey: 'authorizerAssignmentStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatUTCDate(row.original.authorizerAssignmentStartDate),
        size: 130,
      },
      {
        accessorKey: 'authorizerAssignmentEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => (row.original.authorizerAssignmentEndDate ? formatUTCDate(row.original.authorizerAssignmentEndDate) : '—'),
        size: 130,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ),
        size: 80,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const teamMemberOptions: ComboBoxOption[] = teamMembers.map((tm) => ({
    value: tm.teamMemberId.toString(),
    label: formatTeamMemberOption(tm),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleCreateClick}>
          <Plus size={16} className="me-1" />
          New Assignment
        </Button>
      </div>

      <DataGridContainer>
        <DataGrid table={table} recordCount={items.length} isLoading={loading} emptyMessage="No authorizer assignments found.">
          <DataGridTable />
        </DataGrid>
      </DataGridContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Authorizer Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>
                  Team Member <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="teamMemberId"
                  control={control}
                  rules={{ required: 'Team member is required' }}
                  render={({ field }) => (
                    <ComboBox
                      options={teamMemberOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a team member"
                      searchPlaceholder="Search team members..."
                      emptyMessage="No team members found."
                    />
                  )}
                />
                {errors.teamMemberId && <p className="text-sm text-destructive">{errors.teamMemberId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>
                  Authorizer <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="authorizerId"
                  control={control}
                  rules={{ required: 'Authorizer is required' }}
                  render={({ field }) => (
                    <ComboBox
                      options={teamMemberOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select an authorizer"
                      searchPlaceholder="Search team members..."
                      emptyMessage="No team members found."
                    />
                  )}
                />
                {errors.authorizerId && <p className="text-sm text-destructive">{errors.authorizerId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorizerAssignmentStartDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="authorizerAssignmentStartDate"
                  type="date"
                  {...register('authorizerAssignmentStartDate', { required: 'Start date is required' })}
                />
                {errors.authorizerAssignmentStartDate && (
                  <p className="text-sm text-destructive">{errors.authorizerAssignmentStartDate.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this authorizer assignment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
