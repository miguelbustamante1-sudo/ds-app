import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
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
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEntityList } from '@/hooks/use-entity-list';
import { TeamMemberFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return String(date);
  }
};

export function TeamMembersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMemberDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTeamMember, setDeletingTeamMember] = useState<TeamMemberDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const teamMembers = useEntityList<TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO>({
    endpoint: '/api/team-members',
    idKey: 'teamMemberId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (teamMember: TeamMemberDTO) => {
    setEditingTeamMember(teamMember);
    setFormOpen(true);
  };

  const handleDeleteClick = (teamMember: TeamMemberDTO) => {
    setDeletingTeamMember(teamMember);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<TeamMemberDTO>[]>(
    () => [
      {
        accessorKey: 'teamMemberId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.teamMemberId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'teamMemberNames',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Names" />,
        size: 150,
        meta: { headerTitle: 'Names', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'teamMemberSurnames',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Surnames" />,
        size: 150,
        meta: { headerTitle: 'Surnames', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'teamMemberKnownAs',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Known As" />,
        cell: ({ row }) => row.original.teamMemberKnownAs || '-',
        size: 120,
        meta: { headerTitle: 'Known As', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'teamMemberSeniority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Seniority" />,
        size: 100,
        meta: { headerTitle: 'Seniority', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'teamMemberStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.teamMemberStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => row.original.countryName ?? '-',
        size: 120,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'roleName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: ({ row }) => row.original.roleName ?? '-',
        size: 150,
        meta: { headerTitle: 'Role', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => row.original.workdayId || '-',
        size: 120,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: teamMembers.items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    teamMembers.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingTeamMember(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTeamMember) return;

    try {
      await teamMembers.deleteItem(deletingTeamMember.teamMemberId);
      setDeleteDialogOpen(false);
      setDeletingTeamMember(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingTeamMember(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingTeamMember(undefined);
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Team Members</ToolbarPageTitle>
          <ToolbarDescription>Manage team members catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            New Team Member
          </Button>
        </ToolbarActions>
      </Toolbar>

      {/* Search Input */}
      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={teamMembers.loading}
          emptyMessage="No team members found. Create your first team member to get started."
          tableLayout={{
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <TeamMemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teamMember={editingTeamMember}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team member "{deletingTeamMember?.teamMemberNames} {deletingTeamMember?.teamMemberSurnames}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
