import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  SupervisorAssignmentDTO,
  CreateSupervisorAssignmentDTO,
  UpdateSupervisorAssignmentDTO,
  SupervisorCoverageDTO,
} from '@shared/dto';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
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
import { BackToHubButton } from '@/components/BackToHubButton';
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
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { SupervisorAssignmentFormDialog } from './form';
import { SupervisorAssignmentTransferDialog } from './transfer-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  return formatUTCDate(String(date));
};

const formatTeamMemberDisplay = (
  teamMember: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string } | null
) => {
  if (!teamMember) return '-';
  const name = `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;
  return teamMember.workdayId ? `${teamMember.workdayId} - ${name}` : name;
};

type TeamMemberStatus = 'Active' | 'Retired';

const EMPLOYEE_STATUS_OPTIONS: Array<{ label: string; value: TeamMemberStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Retired', value: 'Retired' },
];

const getTeamMemberStatus = (
  teamMember: { teamMemberEndDate: Date | string | null } | null
): TeamMemberStatus => {
  if (!teamMember?.teamMemberEndDate) return 'Active';
  const endDate = parseUTCDateAsLocal(teamMember.teamMemberEndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate <= today ? 'Retired' : 'Active';
};

type AssignmentStatus = 'Active' | 'Ended';

const ASSIGNMENT_STATUS_OPTIONS: Array<{ label: string; value: AssignmentStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Ended', value: 'Ended' },
];

const getAssignmentStatus = (
  supervisorAssignmentEndDate: Date | string | null
): AssignmentStatus => {
  if (!supervisorAssignmentEndDate) return 'Active';
  const endDate = parseUTCDateAsLocal(supervisorAssignmentEndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate <= today ? 'Ended' : 'Active';
};

export function SupervisorAssignmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SupervisorAssignmentDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<SupervisorAssignmentDTO | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'employeeStatus', value: ['Active'] },
    { id: 'assignmentStatus', value: ['Active'] },
  ]);
  const [activeCoverageBySupervisor, setActiveCoverageBySupervisor] = useState<
    Map<number, { toSupervisorName: string; coverageEndDate: Date | string | null }>
  >(new Map());
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();
  const hasCoverageReadPermission = canRead('SupervisorCoverage');

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
        cell: ({ row }) => {
          const coverage = row.original.supervisor
            ? activeCoverageBySupervisor.get(row.original.supervisor.teamMemberId)
            : undefined;
          return (
            <div className="flex items-center gap-2">
              <span>{formatTeamMemberDisplay(row.original.supervisor)}</span>
              {coverage && (
                <Badge variant="info">
                  Covered by {coverage.toSupervisorName}
                  {coverage.coverageEndDate ? ` until ${formatDate(coverage.coverageEndDate)}` : ''}
                </Badge>
              )}
            </div>
          );
        },
        filterFn: (row, _id, value: string[]) => {
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
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.teamMember?.teamMemberId?.toString() ?? '');
        },
        size: 250,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'employeeStatus',
        accessorFn: (row) => getTeamMemberStatus(row.teamMember),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee Status" />,
        cell: ({ row }) => {
          const status = getTeamMemberStatus(row.original.teamMember);
          return (
            <Badge variant={status === 'Active' ? 'success' : 'secondary'}>
              {status}
            </Badge>
          );
        },
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(getTeamMemberStatus(row.original.teamMember));
        },
        size: 100,
        meta: { headerTitle: 'Employee Status', skeleton: <Skeleton className="h-4 w-16" /> },
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
        id: 'assignmentStatus',
        accessorFn: (row) => getAssignmentStatus(row.supervisorAssignmentEndDate),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assignment Status" />,
        cell: ({ row }) => {
          const status = getAssignmentStatus(row.original.supervisorAssignmentEndDate);
          return (
            <Badge variant={status === 'Active' ? 'success' : 'secondary'}>
              {status}
            </Badge>
          );
        },
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(getAssignmentStatus(row.original.supervisorAssignmentEndDate));
        },
        size: 130,
        meta: { headerTitle: 'Assignment Status', skeleton: <Skeleton className="h-4 w-16" /> },
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
    [canCreate, canDelete, activeCoverageBySupervisor],
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
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  useEffect(() => {
    assignments.loadItems();
  }, []);

  useEffect(() => {
    if (!hasCoverageReadPermission) return;
    apiGet<SupervisorCoverageDTO[]>('/api/supervisor-coverage')
      .then((records) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const map = new Map<number, { toSupervisorName: string; coverageEndDate: Date | string | null }>();
        records.forEach((r) => {
          const start = parseUTCDateAsLocal(r.coverageStartDate);
          const isActive =
            !r.coverageEndedAt &&
            start <= today &&
            (!r.coverageEndDate || parseUTCDateAsLocal(r.coverageEndDate) >= today);
          if (isActive) {
            map.set(r.fromSupervisorId, {
              toSupervisorName: `${r.toSupervisor.teamMemberNames} ${r.toSupervisor.teamMemberSurnames}`,
              coverageEndDate: r.coverageEndDate,
            });
          }
        });
        setActiveCoverageBySupervisor(map);
      })
      .catch(() => {
        setActiveCoverageBySupervisor(new Map());
        toast({ title: 'Error', description: 'Failed to load supervisor coverage', variant: 'destructive' });
      });
  }, [hasCoverageReadPermission]);

  // Filter options for supervisor and team member columns
  const supervisorOptions = useMemo(() => {
    const unique = new Map<string, string>();
    assignments.items.forEach((item) => {
      if (item.supervisor) {
        const value = item.supervisor.teamMemberId.toString();
        const label = formatTeamMemberDisplay(item.supervisor);
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
        const label = formatTeamMemberDisplay(item.teamMember);
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
          <BackToHubButton hubPath="/maintenance-hub" />
          {hasCoverageReadPermission && (
            <Button variant="outline" asChild>
              <Link to="/maintenance/supervisor-coverage">Manage Coverage</Link>
            </Button>
          )}
          {canCreate('SupervisorAssignments') && (
            <>
              <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
                Transfer Assignments
              </Button>
              <Button onClick={handleCreate}>
                <Plus size={16} className="me-1" />
                New Assignment
              </Button>
            </>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('employeeStatus') && (
          <DataGridColumnFilter
            column={table.getColumn('employeeStatus')}
            title="Employee Status"
            options={EMPLOYEE_STATUS_OPTIONS}
          />
        )}
        {table.getColumn('assignmentStatus') && (
          <DataGridColumnFilter
            column={table.getColumn('assignmentStatus')}
            title="Assignment Status"
            options={ASSIGNMENT_STATUS_OPTIONS}
          />
        )}
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
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <SupervisorAssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        assignment={editingAssignment}
        onSuccess={handleFormSuccess}
        onCreated={() => assignments.loadItems()}
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

      <SupervisorAssignmentTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onSuccess={() => assignments.loadItems()}
      />
    </div>
  );
}
