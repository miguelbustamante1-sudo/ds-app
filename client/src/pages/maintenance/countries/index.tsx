import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CountryDTO, CreateCountryDTO, UpdateCountryDTO } from '@shared/dto';
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
import { CountryFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function CountriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCountry, setDeletingCountry] = useState<CountryDTO | null>(null);
  const { toast } = useToast();

  const countries = useEntityList<CountryDTO, CreateCountryDTO, UpdateCountryDTO>({
    endpoint: '/api/countries',
    idKey: 'countryId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    countries.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingCountry(undefined);
    setFormOpen(true);
  };

  const handleEdit = (country: CountryDTO) => {
    setEditingCountry(country);
    setFormOpen(true);
  };

  const handleDeleteClick = (country: CountryDTO) => {
    setDeletingCountry(country);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCountry) return;

    try {
      await countries.deleteItem(deletingCountry.countryId);
      setDeleteDialogOpen(false);
      setDeletingCountry(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingCountry(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingCountry(undefined);
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Countries</ToolbarPageTitle>
          <ToolbarDescription>Manage countries catalog</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            New Country
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {countries.loading ? (
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
                <TableHead>Region ID</TableHead>
                <TableHead>ISO Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No countries found. Create your first country to get started.
                  </TableCell>
                </TableRow>
              ) : (
                countries.items.map((country) => (
                  <TableRow key={country.countryId}>
                    <TableCell className="font-medium">{country.countryId}</TableCell>
                    <TableCell>{country.countryName}</TableCell>
                    <TableCell>{country.regionId ?? '-'}</TableCell>
                    <TableCell>{country.countryIso ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(country)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(country)}
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

      <CountryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        country={editingCountry}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the country "{deletingCountry?.countryName}".
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
