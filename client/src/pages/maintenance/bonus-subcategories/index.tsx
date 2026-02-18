import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BonusSubcategoryDTO, CreateBonusSubcategoryDTO, UpdateBonusSubcategoryDTO } from '@shared/dto';
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
import { useEntityList } from '@/hooks/use-entity-list';
import { BonusSubcategoryFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function BonusSubcategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<BonusSubcategoryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<BonusSubcategoryDTO | null>(null);
  const { toast } = useToast();

  const bonusSubcategories = useEntityList<BonusSubcategoryDTO, CreateBonusSubcategoryDTO, UpdateBonusSubcategoryDTO>({
    endpoint: '/api/bonus-subcategories',
    idKey: 'bonusSubcategoryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    bonusSubcategories.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingSubcategory(undefined);
    setFormOpen(true);
  };

  const handleEdit = (subcategory: BonusSubcategoryDTO) => {
    setEditingSubcategory(subcategory);
    setFormOpen(true);
  };

  const handleDeleteClick = (subcategory: BonusSubcategoryDTO) => {
    setDeletingSubcategory(subcategory);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubcategory) return;

    try {
      await bonusSubcategories.deleteItem(deletingSubcategory.bonusSubcategoryId);
      setDeleteDialogOpen(false);
      setDeletingSubcategory(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingSubcategory(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingSubcategory(undefined);
    bonusSubcategories.loadItems();
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Bonus Subcategories</ToolbarPageTitle>
          <ToolbarDescription>Manage bonus subcategory catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            New Subcategory
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {bonusSubcategories.loading ? (
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
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Default Amount</TableHead>
                <TableHead>Metadata Fields</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonusSubcategories.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bonus subcategories found. Create your first subcategory to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bonusSubcategories.items.map((subcategory) => (
                  <TableRow key={subcategory.bonusSubcategoryId}>
                    <TableCell className="font-medium">{subcategory.bonusSubcategoryId}</TableCell>
                    <TableCell>{subcategory.bonusSubcategoryName}</TableCell>
                    <TableCell>{subcategory.bonusCategory?.bonusCategoryName ?? '-'}</TableCell>
                    <TableCell>{subcategory.country?.countryName ?? '-'}</TableCell>
                    <TableCell>
                      {subcategory.bonusSubcategoryDefaultAmount != null
                        ? Number(subcategory.bonusSubcategoryDefaultAmount).toFixed(2)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {Object.keys(subcategory.bonusSubcategoryMetadata ?? {}).length}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subcategory)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(subcategory)}
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <BonusSubcategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        bonusSubcategory={editingSubcategory}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bonus subcategory "{deletingSubcategory?.bonusSubcategoryName}".
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
