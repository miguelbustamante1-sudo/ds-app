import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { IncomeTypeDTO, CreateIncomeTypeDTO, UpdateIncomeTypeDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useForm, Controller } from 'react-hook-form';
import { formatUTCDate } from '@/lib/utils';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface IncomeTypeFormData {
  incomeTypeName: string;
  incomeTypeIsActive: boolean;
}

export function IncomeTypesTab() {
  const [items, setItems] = useState<IncomeTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeTypeDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<IncomeTypeDTO | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<IncomeTypeFormData>({
    defaultValues: { incomeTypeName: '', incomeTypeIsActive: true },
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet<IncomeTypeDTO[]>('/api/income-types');
      setItems(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to load income types', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (formOpen) {
      reset(
        editingRecord
          ? { incomeTypeName: editingRecord.incomeTypeName, incomeTypeIsActive: editingRecord.incomeTypeIsActive }
          : { incomeTypeName: '', incomeTypeIsActive: true },
      );
    }
  }, [formOpen, editingRecord, reset]);

  const handleCreate = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const handleEdit = (record: IncomeTypeDTO) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const onSubmit = async (data: IncomeTypeFormData) => {
    try {
      if (editingRecord) {
        const payload: UpdateIncomeTypeDTO = { incomeTypeName: data.incomeTypeName, incomeTypeIsActive: data.incomeTypeIsActive };
        const updated = await apiPut<IncomeTypeDTO, UpdateIncomeTypeDTO>(`/api/income-types/${editingRecord.incomeTypeId}`, payload);
        setItems((prev) => prev.map((i) => (i.incomeTypeId === updated.incomeTypeId ? updated : i)));
        toast({ title: 'Success', description: 'Income type updated' });
      } else {
        const payload: CreateIncomeTypeDTO = { incomeTypeName: data.incomeTypeName, incomeTypeIsActive: data.incomeTypeIsActive };
        const created = await apiPost<IncomeTypeDTO, CreateIncomeTypeDTO>('/api/income-types', payload);
        setItems((prev) => [...prev, created]);
        toast({ title: 'Success', description: 'Income type created' });
      }
      setFormOpen(false);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save income type', variant: 'destructive' });
    }
  };

  const handleDeleteClick = (record: IncomeTypeDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await apiDelete(`/api/income-types/${deletingRecord.incomeTypeId}`);
      setItems((prev) => prev.filter((i) => i.incomeTypeId !== deletingRecord.incomeTypeId));
      toast({ title: 'Success', description: 'Income type deleted' });
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete income type', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const columns = useMemo<ColumnDef<IncomeTypeDTO>[]>(
    () => [
      {
        accessorKey: 'incomeTypeName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 220,
      },
      {
        accessorKey: 'incomeTypeIsActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={row.original.incomeTypeIsActive ? 'success' : 'secondary'}>
            {row.original.incomeTypeIsActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
        size: 120,
      },
      {
        accessorKey: 'incomeTypeCreatedDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => formatUTCDate(row.original.incomeTypeCreatedDate),
        size: 130,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
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
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleCreate}>
          <Plus size={16} className="me-1" />
          New Income Type
        </Button>
      </div>

      <DataGridContainer>
        <DataGrid table={table} recordCount={items.length} isLoading={loading} emptyMessage="No income types found.">
          <DataGridTable />
        </DataGrid>
      </DataGridContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Income Type' : 'New Income Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="incomeTypeName">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="incomeTypeName" {...register('incomeTypeName', { required: 'Name is required' })} />
                {errors.incomeTypeName && <p className="text-sm text-destructive">{errors.incomeTypeName.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="incomeTypeIsActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox id="incomeTypeIsActive" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label htmlFor="incomeTypeIsActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingRecord?.incomeTypeName}". If it's used by existing entries, the
              delete will fail — deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
