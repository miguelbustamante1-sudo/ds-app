import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { ProjectDTO, CreateProjectDTO, UpdateProjectDTO } from '@shared/dto';
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
import { Badge } from '@/components/ui/badge';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { ProjectFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/pages/reports/components/ExportButton';
import { formatUTCDate } from '@/lib/utils';

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  return formatUTCDate(value);
};

export function ProjectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const projects = useEntityList<ProjectDTO, CreateProjectDTO, UpdateProjectDTO>({
    endpoint: '/api/projects',
    idKey: 'projectId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  const handleEdit = (project: ProjectDTO) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteClick = (project: ProjectDTO) => {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<ProjectDTO>[]>(
    () => [
      {
        accessorKey: 'projectId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.projectId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => row.original.projectName ?? '-',
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'projectExternalId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="External ID" />,
        cell: ({ row }) => row.original.projectExternalId ?? '-',
        size: 140,
        meta: { headerTitle: 'External ID', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'projectSow',
        header: ({ column }) => <DataGridColumnHeader column={column} title="SOW" />,
        cell: ({ row }) => row.original.projectSow ?? '-',
        size: 120,
        meta: { headerTitle: 'SOW', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'projectStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.projectStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'projectEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.projectEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'clientName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Client" />,
        cell: ({ row }) => row.original.clientName ?? '-',
        size: 160,
        meta: { headerTitle: 'Client', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'projectActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (
          <Badge variant={row.original.projectActive ? 'primary' : 'secondary'}>
            {row.original.projectActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
        size: 100,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('Projects') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('Projects') && (
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
    data: projects.items,
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
    projects.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;

    try {
      await projects.deleteItem(deletingProject.projectId);
      setDeleteDialogOpen(false);
      setDeletingProject(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingProject(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingProject(undefined);
    projects.loadItems();
  };

  if (!canRead('Projects')) {
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
          <ToolbarPageTitle>Projects</ToolbarPageTitle>
          <ToolbarDescription>Manage projects catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <ExportButton
            searchParams={new URLSearchParams()}
            baseEndpoint="/api/projects"
            filenamePrefix="projects"
          />
          {canCreate('Projects') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Project
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      {/* Search Input */}
      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={projects.loading}
          emptyMessage="No projects found. Create your first project to get started."
          tableLayout={{
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{deletingProject?.projectName}".
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
