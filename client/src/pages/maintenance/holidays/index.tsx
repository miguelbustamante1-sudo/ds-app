import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { HolidayDTO, CreateHolidayDTO, UpdateHolidayDTO } from '@shared/dto';
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
import { HolidayFormDialog } from './form';
import { Skeleton } from '@/components/ui/skeleton';

export function HolidaysPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<HolidayDTO | null>(null);
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const holidays = useEntityList<HolidayDTO, CreateHolidayDTO, UpdateHolidayDTO>({
    endpoint: '/api/holidays',
    idKey: 'holidayId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    holidays.loadItems();
  }, []);

  const handleCreate = () => {
    setEditingHoliday(undefined);
    setFormOpen(true);
  };

  const handleEdit = (holiday: HolidayDTO) => {
    setEditingHoliday(holiday);
    setFormOpen(true);
  };

  const handleDeleteClick = (holiday: HolidayDTO) => {
    setDeletingHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHoliday) return;

    try {
      await holidays.deleteItem(deletingHoliday.holidayId);
      setDeleteDialogOpen(false);
      setDeletingHoliday(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingHoliday(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingHoliday(undefined);
    holidays.loadItems();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!canRead('Holidays')) {
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
          <ToolbarPageTitle>Holidays</ToolbarPageTitle>
          <ToolbarDescription>Manage holidays by country</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('Holidays') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Holiday
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        {holidays.loading ? (
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
                <TableHead>Date</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Half Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No holidays found. Create your first holiday to get started.
                  </TableCell>
                </TableRow>
              ) : (
                holidays.items.map((holiday) => (
                  <TableRow key={holiday.holidayId}>
                    <TableCell className="font-medium">{holiday.holidayId}</TableCell>
                    <TableCell>{holiday.holidayName}</TableCell>
                    <TableCell>{formatDate(holiday.holidayDate)}</TableCell>
                    <TableCell>{holiday.countryName ?? '-'}</TableCell>
                    <TableCell>{holiday.holidayIsRecurring ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{holiday.holidayIsHalfDay ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canCreate('Holidays') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete('Holidays') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(holiday)}
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

      <HolidayFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        holiday={editingHoliday}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the holiday "{deletingHoliday?.holidayName}".
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
