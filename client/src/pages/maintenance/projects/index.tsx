import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ProjectDTO, CreateProjectDTO, UpdateProjectDTO } from '@shared/dto';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { ProjectFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export function ProjectsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const projects = useEntityList<ProjectDTO, CreateProjectDTO, UpdateProjectDTO>({
    endpoint: '/api/projects',
    idKey: 'projectId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    projects.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };

  const handleEdit = (project: ProjectDTO) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteClick = (project: ProjectDTO) => {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
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
          {canCreate('Projects') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Project
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {projects.loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>SOW</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No projects found. Create your first project to get started.
                  </TableCell>
                </TableRow>
              ) : (
                projects.items.map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell className="font-medium">{project.projectId}</TableCell>
                    <TableCell>{project.projectName ?? '-'}</TableCell>
                    <TableCell>{project.projectExternalId ?? '-'}</TableCell>
                    <TableCell>{project.projectSow ?? '-'}</TableCell>
                    <TableCell>{formatDate(project.projectStartDate)}</TableCell>
                    <TableCell>{formatDate(project.projectEndDate)}</TableCell>
                    <TableCell>
                      <Badge variant={project.projectActive ? 'primary' : 'secondary'}>
                        {project.projectActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCreate('Projects') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(project)}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete('Projects') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(project)}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

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
