import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { WtkWorkflowTemplateTask, WtiWorkflowTemplateTaskInput } from '../types';

interface InputFormData {
  code: string;
  label: string;
  description: string;
  dataType: string;
  isRequired: boolean;
  isRoutingInput: boolean;
  displayOrder: string;
  defaultValue: string;
  validationRule: string;
  optionSetJson: string;
}

interface TaskInputPanelProps {
  wflId: string;
  task: WtkWorkflowTemplateTask;
  onRefresh: () => void;
  isDraft: boolean;
}

const DATA_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'DateTime' },
  { value: 'SELECT', label: 'Select' },
];

export function TaskInputPanel({ wflId, task, onRefresh, isDraft }: TaskInputPanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<WtiWorkflowTemplateTaskInput | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);

  const inputs = task.inputs ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InputFormData>({
    defaultValues: {
      code: '', label: '', description: '', dataType: 'TEXT',
      isRequired: false, isRoutingInput: false, displayOrder: '',
      defaultValue: '', validationRule: '', optionSetJson: '',
    },
  });

  useEffect(() => {
    if (drawerOpen) {
      reset({
        code: editingInput?.code ?? '',
        label: editingInput?.label ?? '',
        description: editingInput?.description ?? '',
        dataType: editingInput?.dataType ?? 'TEXT',
        isRequired: editingInput?.isRequired ?? false,
        isRoutingInput: editingInput?.isRoutingInput ?? false,
        displayOrder: editingInput?.displayOrder?.toString() ?? '',
        defaultValue: editingInput?.defaultValue ?? '',
        validationRule: editingInput?.validationRule ?? '',
        optionSetJson: editingInput?.optionSetJson
          ? JSON.stringify(editingInput.optionSetJson)
          : '',
      });
    }
  }, [drawerOpen, editingInput, reset]);

  const watchedDataType = watch('dataType');

  const handleAdd = () => {
    setEditingInput(undefined);
    setDrawerOpen(true);
  };

  const handleEdit = (input: WtiWorkflowTemplateTaskInput) => {
    setEditingInput(input);
    setDrawerOpen(true);
  };

  const handleDelete = async (wtiId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/tasks/${task.wtkId}/inputs/${wtiId}`);
      toast({ title: 'Success', description: 'Input deleted.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete input';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: InputFormData) => {
    let parsedOptionSet: unknown = null;
    if (data.dataType === 'SELECT' && data.optionSetJson.trim()) {
      try {
        parsedOptionSet = JSON.parse(data.optionSetJson);
      } catch {
        toast({ title: 'Error', description: 'Option Set JSON is invalid.', variant: 'destructive' });
        return;
      }
    }

    const payload = {
      code: data.code.trim(),
      label: data.label.trim(),
      description: data.description.trim() || null,
      dataType: data.dataType,
      isRequired: data.isRequired,
      isRoutingInput: data.isRoutingInput,
      displayOrder: parseInt(data.displayOrder, 10) || 0,
      defaultValue: data.defaultValue.trim() || null,
      validationRule: data.validationRule.trim() || null,
      optionSetJson: parsedOptionSet,
    };

    try {
      if (editingInput) {
        await apiPatch<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks/${task.wtkId}/inputs/${editingInput.wtiId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Input updated.' });
      } else {
        await apiPost<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks/${task.wtkId}/inputs`,
          payload,
        );
        toast({ title: 'Success', description: 'Input created.' });
      }
      setDrawerOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save input';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WtiWorkflowTemplateTaskInput>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        size: 120,
        meta: { headerTitle: 'Code', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'label',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Label" />,
        size: 160,
        meta: { headerTitle: 'Label', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'dataType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="outline" size="sm">{row.original.dataType}</Badge>,
        size: 100,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-5 w-16" /> },
      },
      {
        accessorKey: 'isRequired',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Required" />,
        cell: ({ row }) => (row.original.isRequired ? 'Yes' : 'No'),
        size: 90,
        meta: { headerTitle: 'Required', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'isRoutingInput',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Routing" />,
        cell: ({ row }) => (row.original.isRoutingInput ? 'Yes' : 'No'),
        size: 80,
        meta: { headerTitle: 'Routing', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'displayOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Order" />,
        size: 70,
        meta: { headerTitle: 'Order', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDraft ? (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtiId)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ) : null,
        size: 80,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-16 ml-auto" />,
        },
      },
    ],
    [isDraft],
  );

  const table = useReactTable({
    data: inputs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      {isDraft && (
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus size={14} className="me-1" />
            Add Input
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={inputs.length}
          isLoading={false}
          emptyMessage="No inputs defined."
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10]} />
        </DataGrid>
      </DataGridContainer>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingInput ? 'Edit Input' : 'Add Input'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inp-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inp-code"
                  {...register('code', { required: 'Code is required' })}
                />
                {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inp-order">Display Order</Label>
                <Input id="inp-order" type="number" {...register('displayOrder')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inp-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inp-label"
                {...register('label', { required: 'Label is required' })}
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inp-desc">Description</Label>
              <Textarea id="inp-desc" {...register('description')} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>
                Data Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={DATA_TYPE_OPTIONS}
                value={watchedDataType}
                onValueChange={(v) => setValue('dataType', v)}
                placeholder="Select type..."
              />
            </div>

            {watchedDataType === 'SELECT' && (
              <div className="space-y-1.5">
                <Label htmlFor="inp-options">Option Set (JSON)</Label>
                <Textarea
                  id="inp-options"
                  {...register('optionSetJson')}
                  rows={3}
                  placeholder='[{"value":"A","label":"Option A"}]'
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="inp-default">Default Value</Label>
              <Input id="inp-default" {...register('defaultValue')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inp-validation">Validation Rule</Label>
              <Input id="inp-validation" {...register('validationRule')} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  id="inp-required"
                  checked={watch('isRequired')}
                  onCheckedChange={(v) => setValue('isRequired', v)}
                />
                <Label htmlFor="inp-required">Required</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="inp-routing"
                  checked={watch('isRoutingInput')}
                  onCheckedChange={(v) => setValue('isRoutingInput', v)}
                />
                <Label htmlFor="inp-routing">Routing Input</Label>
              </div>
            </div>

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingInput ? 'Update' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
