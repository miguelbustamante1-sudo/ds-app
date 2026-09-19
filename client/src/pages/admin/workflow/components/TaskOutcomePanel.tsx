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
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
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
import { Plus, Trash2, Eye } from 'lucide-react';
import { apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { WtkWorkflowTemplateTask, WtoWorkflowTemplateTaskOutcome } from '../types';

interface OutcomeFormData {
  code: string;
  label: string;
  description: string;
  isTerminal: boolean;
  triggersOutcomeAction: boolean;
  executionType: string;
  outcomeProcName: string;
}

const EXECUTION_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'CODE', label: 'Code (TypeScript handler)' },
  { value: 'DATABASE', label: 'Database (stored procedure)' },
];

interface TaskOutcomePanelProps {
  wflId: string;
  task: WtkWorkflowTemplateTask;
  onRefresh: () => void;
  isDraft: boolean;
  canEdit: boolean;
}

export function TaskOutcomePanel({ wflId, task, onRefresh, isDraft, canEdit }: TaskOutcomePanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingOutcome, setViewingOutcome] = useState<WtoWorkflowTemplateTaskOutcome | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);

  const outcomes = task.outcomes ?? [];
  const isViewing = !!viewingOutcome;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OutcomeFormData>({
    defaultValues: {
      code: '',
      label: '',
      description: '',
      isTerminal: false,
      triggersOutcomeAction: false,
      executionType: 'CODE',
      outcomeProcName: '',
    },
  });

  const watchedExecutionType = watch('executionType');

  useEffect(() => {
    if (drawerOpen) {
      reset({
        code: viewingOutcome?.code ?? '',
        label: viewingOutcome?.label ?? '',
        description: viewingOutcome?.description ?? '',
        isTerminal: viewingOutcome?.isTerminal ?? false,
        triggersOutcomeAction: viewingOutcome?.triggersOutcomeAction ?? false,
        executionType: viewingOutcome?.executionType ?? 'CODE',
        outcomeProcName: viewingOutcome?.outcomeProcName ?? '',
      });
    }
  }, [drawerOpen, viewingOutcome, reset]);

  const handleAdd = () => {
    setViewingOutcome(undefined);
    setDrawerOpen(true);
  };

  const handleView = (outcome: WtoWorkflowTemplateTaskOutcome) => {
    setViewingOutcome(outcome);
    setDrawerOpen(true);
  };

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
      triggersOutcomeAction: data.triggersOutcomeAction,
      executionType: data.executionType,
      outcomeProcName: data.executionType === 'DATABASE' ? (data.outcomeProcName.trim() || null) : null,
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
        accessorKey: 'triggersOutcomeAction',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Triggers Action" />,
        cell: ({ row }) => (row.original.triggersOutcomeAction ? 'Yes' : 'No'),
        size: 110,
        meta: { headerTitle: 'Triggers Action', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'executionType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        size: 90,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-14" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleView(row.original)}>
              <Eye size={14} />
            </Button>
            {isDraft && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtoId)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 80,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-10 ml-auto" />,
        },
      },
    ],
    [isDraft, canEdit],
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
      {canEdit && (
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" onClick={handleAdd}>
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
            <SheetTitle>{isViewing ? 'Outcome Details' : 'Add Outcome'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="out-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="out-code"
                disabled={isViewing}
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
                disabled={isViewing}
                {...register('label', { required: 'Label is required' })}
                placeholder="e.g. Approved"
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="out-desc">Description</Label>
              <Input id="out-desc" disabled={isViewing} {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>
                Execution Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={EXECUTION_TYPE_OPTIONS}
                value={watchedExecutionType}
                onValueChange={(v) => setValue('executionType', v)}
                placeholder="Select execution type..."
                disabled={isViewing}
              />
            </div>

            {watchedExecutionType === 'DATABASE' && (
              <div className="space-y-1.5">
                <Label htmlFor="out-proc-name">
                  Outcome Procedure Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="out-proc-name"
                  disabled={isViewing}
                  {...register('outcomeProcName')}
                  placeholder="e.g. sp_handle_team_member_change_outcome"
                />
                <p className="text-xs text-muted-foreground">
                  Called instead of the TypeScript outcome-handler registry when this outcome is
                  chosen. Must already exist in the database (checked at publish time).
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="out-terminal"
                checked={watch('isTerminal')}
                onCheckedChange={(v) => setValue('isTerminal', v)}
                disabled={isViewing}
              />
              <Label htmlFor="out-terminal">Terminal Outcome</Label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="out-triggers-action"
                checked={watch('triggersOutcomeAction')}
                onCheckedChange={(v) => setValue('triggersOutcomeAction', v)}
                disabled={isViewing}
              />
              <div>
                <Label htmlFor="out-triggers-action">Triggers Outcome Action</Label>
                <p className="text-xs text-muted-foreground">
                  When this outcome is chosen, run the domain handler registered for this workflow's linked business record (e.g. update the linked time-off request's status).
                </p>
              </div>
            </div>

            <SheetFooter className="pt-4">
              {isViewing ? (
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Create'}
                  </Button>
                </>
              )}
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
