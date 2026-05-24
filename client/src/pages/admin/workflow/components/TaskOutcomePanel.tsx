import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
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
import { Plus, Trash2 } from 'lucide-react';
import { apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { WtkWorkflowTemplateTask, WtoWorkflowTemplateTaskOutcome } from '../types';

interface OutcomeFormData {
  code: string;
  label: string;
  description: string;
  isTerminal: boolean;
}

interface TaskOutcomePanelProps {
  wflId: string;
  task: WtkWorkflowTemplateTask;
  onRefresh: () => void;
  isDraft: boolean;
}

export function TaskOutcomePanel({ wflId, task, onRefresh, isDraft }: TaskOutcomePanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const outcomes = task.outcomes ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OutcomeFormData>({
    defaultValues: { code: '', label: '', description: '', isTerminal: false },
  });

  useEffect(() => {
    if (drawerOpen) {
      reset({ code: '', label: '', description: '', isTerminal: false });
    }
  }, [drawerOpen, reset]);

  const handleDelete = async (wtoId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/tasks/${task.wtkId}/outcomes/${wtoId}`);
      toast({ title: 'Success', description: 'Outcome deleted.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete outcome';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: OutcomeFormData) => {
    const payload = {
      code: data.code.trim(),
      label: data.label.trim(),
      description: data.description.trim() || null,
      isTerminal: data.isTerminal,
    };

    try {
      await apiPost<unknown, typeof payload>(
        `/api/workflow/templates/${wflId}/tasks/${task.wtkId}/outcomes`,
        payload,
      );
      toast({ title: 'Success', description: 'Outcome created.' });
      setDrawerOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create outcome';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WtoWorkflowTemplateTaskOutcome>[]>(
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
        size: 200,
        meta: { headerTitle: 'Label', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'isTerminal',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Terminal" />,
        cell: ({ row }) => (row.original.isTerminal ? 'Yes' : 'No'),
        size: 80,
        meta: { headerTitle: 'Terminal', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDraft ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtoId)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          ) : null,
        size: 60,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-10 ml-auto" />,
        },
      },
    ],
    [isDraft],
  );

  const table = useReactTable({
    data: outcomes,
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
          <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
            <Plus size={14} className="me-1" />
            Add Outcome
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={outcomes.length}
          isLoading={false}
          emptyMessage="No outcomes defined."
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10]} />
        </DataGrid>
      </DataGridContainer>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Outcome</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="out-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="out-code"
                {...register('code', { required: 'Code is required' })}
                placeholder="e.g. APPROVED"
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="out-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="out-label"
                {...register('label', { required: 'Label is required' })}
                placeholder="e.g. Approved"
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="out-desc">Description</Label>
              <Input id="out-desc" {...register('description')} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="out-terminal"
                checked={watch('isTerminal')}
                onCheckedChange={(v) => setValue('isTerminal', v)}
              />
              <Label htmlFor="out-terminal">Terminal Outcome</Label>
            </div>

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
