import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { TimeOffCategoryDTO, CreateTimeOffCategoryDTO, UpdateTimeOffCategoryDTO } from '@shared/dto';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
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
import { TimeOffTypeFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function TimeOffTypesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<TimeOffCategoryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<TimeOffCategoryDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const timeOffTypes = useEntityList<TimeOffCategoryDTO, CreateTimeOffCategoryDTO, UpdateTimeOffCategoryDTO>({
    endpoint: '/api/time-off-category',
    idKey: 'categoryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    timeOffTypes.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingType(undefined);
    setFormOpen(true);
  };

  const handleEdit = (type: TimeOffCategoryDTO) => {
    setEditingType(type);
    setFormOpen(true);
  };

  const handleDeleteClick = (type: TimeOffCategoryDTO) => {
    setDeletingType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;

    try {
      await timeOffTypes.deleteItem(deletingType.categoryId);
      setDeleteDialogOpen(false);
      setDeletingType(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingType(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingType(undefined);
    timeOffTypes.loadItems();
  };

  if (!canRead('TimeOffCategories')) {
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
          <ToolbarPageTitle>Type of TimeOff</ToolbarPageTitle>
          <ToolbarDescription>Manage time off type catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('TimeOffCategories') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Type
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {timeOffTypes.loading ? (
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeOffTypes.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No time off types found. Create your first type to get started.
                  </TableCell>
                </TableRow>
              ) : (
                timeOffTypes.items.map((type) => (
                  <TableRow key={type.categoryId}>
                    <TableCell className="font-medium">{type.categoryId}</TableCell>
                    <TableCell>{type.categoryName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCreate('TimeOffCategories') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete('TimeOffCategories') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(type)}
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

      <TimeOffTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        timeOffType={editingType}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the time off type "{deletingType?.categoryName}".
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
