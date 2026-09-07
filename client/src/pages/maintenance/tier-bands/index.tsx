import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { TierBandDTO, CreateTierBandDTO, UpdateTierBandDTO } from '@shared/dto';
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
import { TierBandFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function TierBandsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTierBand, setEditingTierBand] = useState<TierBandDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTierBand, setDeletingTierBand] = useState<TierBandDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const tierBands = useEntityList<TierBandDTO, CreateTierBandDTO, UpdateTierBandDTO>({
    endpoint: '/api/tier-bands',
    idKey: 'tierBandId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    tierBands.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingTierBand(undefined);
    setFormOpen(true);
  };

  const handleEdit = (tierBand: TierBandDTO) => {
    setEditingTierBand(tierBand);
    setFormOpen(true);
  };

  const handleDeleteClick = (tierBand: TierBandDTO) => {
    setDeletingTierBand(tierBand);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTierBand) return;

    try {
      await tierBands.deleteItem(deletingTierBand.tierBandId);
      setDeleteDialogOpen(false);
      setDeletingTierBand(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingTierBand(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingTierBand(undefined);
    tierBands.loadItems();
  };

  if (!canRead('TierBands')) {
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
          <ToolbarPageTitle>Tier Bands</ToolbarPageTitle>
          <ToolbarDescription>Manage tier band catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('TierBands') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Tier Band
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {tierBands.loading ? (
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
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tierBands.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No tier bands found. Create your first tier band to get started.
                  </TableCell>
                </TableRow>
              ) : (
                tierBands.items.map((tierBand) => (
                  <TableRow key={tierBand.tierBandId}>
                    <TableCell className="font-medium">{tierBand.tierBandId}</TableCell>
                    <TableCell>{tierBand.tierBandDescription}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCreate('TierBands') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tierBand)}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete('TierBands') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(tierBand)}
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

      <TierBandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tierBand={editingTierBand}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tier band "{deletingTierBand?.tierBandDescription}".
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
