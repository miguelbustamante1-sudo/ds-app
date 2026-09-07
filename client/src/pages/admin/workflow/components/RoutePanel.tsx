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
import { Plus, Trash2 } from 'lucide-react';
import { apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type {
  WtrWorkflowTemplateRoute,
  WtkWorkflowTemplateTask,
  WtoWorkflowTemplateTaskOutcome,
} from '../types';

interface RouteFormData {
  wtkFromId: string;
  wtoId: string;
  wtkToId: string;
  routeOrder: string;
}

interface RoutePanelProps {
  wflId: string;
  routes: WtrWorkflowTemplateRoute[];
  tasks: WtkWorkflowTemplateTask[];
  onRefresh: () => void;
  isDraft: boolean;
}

export function RoutePanel({ wflId, routes, tasks, onRefresh, isDraft }: RoutePanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<RouteFormData>({
    defaultValues: { wtkFromId: '', wtoId: '', wtkToId: '', routeOrder: '' },
  });

  useEffect(() => {
    if (drawerOpen) {
      reset({ wtkFromId: '', wtoId: '', wtkToId: '', routeOrder: '' });
    }
  }, [drawerOpen, reset]);

  const watchedFromId = watch('wtkFromId');
  const watchedWtoId = watch('wtoId');

  const taskOptions: ComboBoxOption[] = useMemo(
    () => tasks.map((t) => ({ value: t.wtkId, label: `${t.code} — ${t.name}` })),
    [tasks],
  );

  const outcomeOptions: ComboBoxOption[] = useMemo(() => {
    const fromTask = tasks.find((t) => t.wtkId === watchedFromId);
    if (!fromTask?.outcomes) return [];
    return fromTask.outcomes.map((o) => ({ value: o.wtoId, label: `${o.code} — ${o.label}` }));
  }, [tasks, watchedFromId]);

  const toTaskOptions: ComboBoxOption[] = useMemo(
    () => tasks.filter((t) => t.wtkId !== watchedFromId).map((t) => ({ value: t.wtkId, label: `${t.code} — ${t.name}` })),
    [tasks, watchedFromId],
  );

  const getTaskCode = (wtkId: string) => tasks.find((t) => t.wtkId === wtkId)?.code ?? wtkId;

  const getOutcomeLabel = (wtoId: string | null): string => {
    if (!wtoId) return '-';
    for (const task of tasks) {
      const outcome: WtoWorkflowTemplateTaskOutcome | undefined = task.outcomes?.find((o) => o.wtoId === wtoId);
      if (outcome) return outcome.label;
    }
    return wtoId;
  };

  const handleDelete = async (wtrId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/routes/${wtrId}`);
      toast({ title: 'Success', description: 'Route deleted.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete route';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: RouteFormData) => {
    const conditionType = data.wtoId ? 'OUTCOME_ONLY' : 'NONE';
    const payload = {
      wtkFromId: data.wtkFromId,
      wtoId: data.wtoId || null,
      wtkToId: data.wtkToId,
      conditionType,
      routeOrder: parseInt(data.routeOrder, 10) || 1,
    };

    try {
      await apiPost<unknown, typeof payload>(`/api/workflow/templates/${wflId}/routes`, payload);
      toast({ title: 'Success', description: 'Route created.' });
      setDrawerOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create route';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WtrWorkflowTemplateRoute>[]>(
    () => [
      {
        accessorKey: 'wtkFromId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="From Task" />,
        cell: ({ row }) => getTaskCode(row.original.wtkFromId),
        size: 130,
        meta: { headerTitle: 'From Task', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'wtoId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Outcome" />,
        cell: ({ row }) => getOutcomeLabel(row.original.wtoId),
        size: 160,
        meta: { headerTitle: 'Outcome', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'wtkToId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="To Task" />,
        cell: ({ row }) => getTaskCode(row.original.wtkToId),
        size: 130,
        meta: { headerTitle: 'To Task', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'conditionType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Condition" />,
        size: 120,
        meta: { headerTitle: 'Condition', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'routeOrder',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Order" />,
        size: 70,
        meta: { headerTitle: 'Order', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDraft ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtrId)}>
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
    [isDraft, tasks],
  );

  const table = useReactTable({
    data: routes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {isDraft && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus size={14} className="me-1" />
            Add Route
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={routes.length}
          isLoading={false}
          emptyMessage="No routes defined."
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10, 25]} />
        </DataGrid>
      </DataGridContainer>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Route</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>
                From Task <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={taskOptions}
                value={watchedFromId}
                onValueChange={(v) => {
                  setValue('wtkFromId', v);
                  setValue('wtoId', '');
                }}
                placeholder="Select from task..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Outcome (optional)</Label>
              <ComboBox
                options={outcomeOptions}
                value={watchedWtoId}
                onValueChange={(v) => setValue('wtoId', v)}
                placeholder="Select outcome..."
                disabled={!watchedFromId || outcomeOptions.length === 0}
              />
              <p className="text-xs text-muted-foreground">
                {watchedWtoId
                  ? 'Condition: OUTCOME_ONLY'
                  : 'No outcome selected — condition: NONE'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                To Task <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={toTaskOptions}
                value={watch('wtkToId')}
                onValueChange={(v) => setValue('wtkToId', v)}
                placeholder="Select to task..."
                disabled={!watchedFromId}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="route-order">Route Order</Label>
              <Input id="route-order" type="number" min={1} {...register('routeOrder')} placeholder="1" />
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
