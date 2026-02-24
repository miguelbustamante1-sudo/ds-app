import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { SupervisorAssignmentDTO, CreateSupervisorAssignmentDTO, UpdateSupervisorAssignmentDTO } from '@shared/dto';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
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
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { SupervisorAssignmentFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return String(date);
  }
};

const formatTeamMemberDisplay = (
  teamMember: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string } | null
) => {
  if (!teamMember) return '-';
  const name = `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;
  return teamMember.workdayId ? `${teamMember.workdayId} - ${name}` : name;
};

export function SupervisorAssignmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SupervisorAssignmentDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<SupervisorAssignmentDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const assignments = useEntityList<SupervisorAssignmentDTO, CreateSupervisorAssignmentDTO, UpdateSupervisorAssignmentDTO>({
    endpoint: '/api/supervisor-assignments',
    idKey: 'supervisorAssignmentId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (assignment: SupervisorAssignmentDTO) => {
    setEditingAssignment(assignment);
    setFormOpen(true);
  };

  const handleDeleteClick = (assignment: SupervisorAssignmentDTO) => {
    setDeletingAssignment(assignment);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<SupervisorAssignmentDTO>[]>(
    () => [
      {
        accessorKey: 'supervisorAssignmentId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.supervisorAssignmentId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        id: 'supervisor',
        accessorFn: (row) => formatTeamMemberDisplay(row.supervisor),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Supervisor" />,
        cell: ({ row }) => formatTeamMemberDisplay(row.original.supervisor),
        filterFn: (row, id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.supervisor?.teamMemberId?.toString() ?? '');
        },
        size: 250,
        meta: { headerTitle: 'Supervisor', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'teamMember',
        accessorFn: (row) => formatTeamMemberDisplay(row.teamMember),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => formatTeamMemberDisplay(row.original.teamMember),
        filterFn: (row, id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.teamMember?.teamMemberId?.toString() ?? '');
        },
        size: 250,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'supervisorAssignmentStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.supervisorAssignmentStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'supervisorAssignmentEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.supervisorAssignmentEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('SupervisorAssignments') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('SupervisorAssignments') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: assignments.items,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  useEffect(() => {
    assignments.loadItems();
  }, []);

  // Filter options for supervisor and team member columns
  const supervisorOptions = useMemo(() => {
    const unique = new Map<string, string>();
    assignments.items.forEach((item) => {
      if (item.supervisor) {
        const value = item.supervisor.teamMemberId.toString();
        const label = `${item.supervisor.teamMemberNames} ${item.supervisor.teamMemberSurnames}`;
        unique.set(value, label);
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [assignments.items]);

  const teamMemberOptions = useMemo(() => {
    const unique = new Map<string, string>();
    assignments.items.forEach((item) => {
      if (item.teamMember) {
        const value = item.teamMember.teamMemberId.toString();
        const label = `${item.teamMember.teamMemberNames} ${item.teamMember.teamMemberSurnames}`;
        unique.set(value, label);
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [assignments.items]);

  const isFiltered = columnFilters.length > 0;

  const handleCreate = () => {
    setEditingAssignment(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;

    try {
      await assignments.deleteItem(deletingAssignment.supervisorAssignmentId);
      setDeleteDialogOpen(false);
      setDeletingAssignment(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingAssignment(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingAssignment(undefined);
  };

  const getDeleteDescription = () => {
    if (!deletingAssignment) return '';
    const supervisor = deletingAssignment.supervisor
      ? `${deletingAssignment.supervisor.teamMemberNames} ${deletingAssignment.supervisor.teamMemberSurnames}`
      : 'Unknown';
    const teamMember = deletingAssignment.teamMember
      ? `${deletingAssignment.teamMember.teamMemberNames} ${deletingAssignment.teamMember.teamMemberSurnames}`
      : 'Unknown';
    return `This will permanently delete the supervisor assignment where "${supervisor}" supervises "${teamMember}". This action cannot be undone.`;
  };

  if (!canRead('SupervisorAssignments')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Supervisor Assignments</ToolbarPageTitle>
          <ToolbarDescription>Manage supervisor to team member assignments</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('SupervisorAssignments') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Assignment
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('supervisor') && (
          <DataGridColumnFilter
            column={table.getColumn('supervisor')}
            title="Supervisor"
            options={supervisorOptions}
          />
        )}
        {table.getColumn('teamMember') && (
          <DataGridColumnFilter
            column={table.getColumn('teamMember')}
            title="Team Member"
            options={teamMemberOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={assignments.items.length}
          isLoading={assignments.loading}
          emptyMessage="No supervisor assignments found. Create your first assignment to get started."
          tableLayout={{
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
        </DataGrid>
      </DataGridContainer>

      <SupervisorAssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assignment={editingAssignment}
        onSuccess={handleFormSuccess}
        onCreated={(item) => assignments.setItems((prev) => [...prev, item])}
        onUpdated={(item) =>
          assignments.setItems((prev) =>
            prev.map((i) => (i.supervisorAssignmentId === item.supervisorAssignmentId ? item : i))
          )
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>{getDeleteDescription()}</AlertDialogDescription>
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
