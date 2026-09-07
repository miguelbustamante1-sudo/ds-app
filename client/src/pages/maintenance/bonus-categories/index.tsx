import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BonusCategoryDTO, CreateBonusCategoryDTO, UpdateBonusCategoryDTO } from '@shared/dto';
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
import { BonusCategoryFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function BonusCategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BonusCategoryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<BonusCategoryDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const bonusCategories = useEntityList<BonusCategoryDTO, CreateBonusCategoryDTO, UpdateBonusCategoryDTO>({
    endpoint: '/api/bonus-categories',
    idKey: 'bonusCategoryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    bonusCategories.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingCategory(undefined);
    setFormOpen(true);
  };

  const handleEdit = (category: BonusCategoryDTO) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDeleteClick = (category: BonusCategoryDTO) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    try {
      await bonusCategories.deleteItem(deletingCategory.bonusCategoryId);
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingCategory(undefined);
    bonusCategories.loadItems();
  };

  if (!canRead('Endorsements')) {
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
          <ToolbarPageTitle>Bonus Categories</ToolbarPageTitle>
          <ToolbarDescription>Manage bonus category catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Endorsements') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Bonus Category
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {bonusCategories.loading ? (
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
              {bonusCategories.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No bonus categories found. Create your first bonus category to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bonusCategories.items.map((category) => (
                  <TableRow key={category.bonusCategoryId}>
                    <TableCell className="font-medium">{category.bonusCategoryId}</TableCell>
                    <TableCell>{category.bonusCategoryName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCreate('Endorsements') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete('Endorsements') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(category)}
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

      <BonusCategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        bonusCategory={editingCategory}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bonus category "{deletingCategory?.bonusCategoryName}".
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
