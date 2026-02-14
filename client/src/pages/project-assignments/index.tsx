import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type {
  ProjectAssignmentWithDetailsDTO,
  CreateProjectAssignmentDTO,
  UpdateProjectAssignmentDTO,
} from '@shared/dto';
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
import { AssignmentFormDialog } from './components/AssignmentForm';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectAssignmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectAssignmentWithDetailsDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ProjectAssignmentWithDetailsDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const entities = useEntityList<ProjectAssignmentWithDetailsDTO, CreateProjectAssignmentDTO, UpdateProjectAssignmentDTO>({
    endpoint: '/api/team-member-projects',
    idKey: 'projectAssignmentId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (item: ProjectAssignmentWithDetailsDTO) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (item: ProjectAssignmentWithDetailsDTO) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const columns = useMemo<ColumnDef<ProjectAssignmentWithDetailsDTO>[]>(
    () => [
      {
        accessorKey: 'teamMemberName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => row.original.teamMemberName ?? '-',
        size: 180,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: ({ row }) => row.original.projectName ?? '-',
        size: 200,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'projectAssignmentStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.projectAssignmentStartDate),
        size: 130,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'projectAssignmentEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.projectAssignmentEndDate),
        size: 130,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'projectAssignmentAllocation',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Allocation %" />,
        cell: ({ row }) =>
          row.original.projectAssignmentAllocation != null
            ? `${row.original.projectAssignmentAllocation}%`
            : '-',
        size: 120,
        meta: { headerTitle: 'Allocation %', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'projectAssignmentBillRate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bill Rate" />,
        cell: ({ row }) => {
          const rate = row.original.projectAssignmentBillRate;
          const currency = row.original.projectAssignmentBillRateCurrency ?? '';
          return rate != null ? `${currency} ${rate}` : '-';
        },
        size: 130,
        meta: { headerTitle: 'Bill Rate', skeleton: <Skeleton className="h-4 w-20" /> },
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
    data: entities.items,
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
    entities.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingItem(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      await entities.deleteItem(deletingItem.projectAssignmentId);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingItem(undefined);
    entities.loadItems();
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Project Assignments</ToolbarPageTitle>
          <ToolbarDescription>Manage team member project assignments</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            New Assignment
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assignments..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={entities.loading}
          emptyMessage="No project assignments found. Create your first assignment to get started."
          tableLayout={{
            width: 'fixed',
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <AssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the assignment for "{deletingItem?.teamMemberName}" on project "{deletingItem?.projectName}".
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
