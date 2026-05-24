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
import { Plus, Trash2 } from 'lucide-react';
import { apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { WtdWorkflowTemplateDependency, WtkWorkflowTemplateTask } from '../types';

interface DependencyFormData {
  wtkPredecessorId: string;
  wtkSuccessorId: string;
  dependencyType: string;
  joinGroupCode: string;
  isRequired: boolean;
}

interface DependencyPanelProps {
  wflId: string;
  dependencies: WtdWorkflowTemplateDependency[];
  tasks: WtkWorkflowTemplateTask[];
  onRefresh: () => void;
  isDraft: boolean;
}

const DEPENDENCY_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'FINISH_TO_START', label: 'Finish to Start' },
  { value: 'PARALLEL_JOIN', label: 'Parallel Join' },
];

export function DependencyPanel({ wflId, dependencies, tasks, onRefresh, isDraft }: DependencyPanelProps) {
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
  } = useForm<DependencyFormData>({
    defaultValues: {
      wtkPredecessorId: '',
      wtkSuccessorId: '',
      dependencyType: 'FINISH_TO_START',
      joinGroupCode: '',
      isRequired: true,
    },
  });

  useEffect(() => {
    if (drawerOpen) {
      reset({
        wtkPredecessorId: '',
        wtkSuccessorId: '',
        dependencyType: 'FINISH_TO_START',
        joinGroupCode: '',
        isRequired: true,
      });
    }
  }, [drawerOpen, reset]);

  const watchedDepType = watch('dependencyType');
  const watchedPredecessorId = watch('wtkPredecessorId');

  const taskOptions: ComboBoxOption[] = useMemo(
    () => tasks.map((t) => ({ value: t.wtkId, label: `${t.code} — ${t.name}` })),
    [tasks],
  );

  const successorOptions: ComboBoxOption[] = useMemo(
    () =>
      tasks
        .filter((t) => t.wtkId !== watchedPredecessorId)
        .map((t) => ({ value: t.wtkId, label: `${t.code} — ${t.name}` })),
    [tasks, watchedPredecessorId],
  );

  const getTaskCode = (wtkId: string) => tasks.find((t) => t.wtkId === wtkId)?.code ?? wtkId;

  const handleDelete = async (wtdId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/dependencies/${wtdId}`);
      toast({ title: 'Success', description: 'Dependency deleted.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete dependency';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: DependencyFormData) => {
    const payload = {
      wtkPredecessorId: data.wtkPredecessorId,
      wtkSuccessorId: data.wtkSuccessorId,
      dependencyType: data.dependencyType,
      joinGroupCode: data.joinGroupCode.trim() || null,
      isRequired: data.isRequired,
    };

    try {
      await apiPost<unknown, typeof payload>(`/api/workflow/templates/${wflId}/dependencies`, payload);
      toast({ title: 'Success', description: 'Dependency created.' });
      setDrawerOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create dependency';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WtdWorkflowTemplateDependency>[]>(
    () => [
      {
        accessorKey: 'wtkPredecessorId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Predecessor" />,
        cell: ({ row }) => getTaskCode(row.original.wtkPredecessorId),
        size: 130,
        meta: { headerTitle: 'Predecessor', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'wtkSuccessorId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Successor" />,
        cell: ({ row }) => getTaskCode(row.original.wtkSuccessorId),
        size: 130,
        meta: { headerTitle: 'Successor', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'dependencyType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        size: 150,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'joinGroupCode',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Join Group" />,
        cell: ({ row }) => row.original.joinGroupCode ?? '-',
        size: 110,
        meta: { headerTitle: 'Join Group', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'isRequired',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Required" />,
        cell: ({ row }) => (row.original.isRequired ? 'Yes' : 'No'),
        size: 80,
        meta: { headerTitle: 'Required', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isDraft ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtdId)}>
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
    data: dependencies,
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
            Add Dependency
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={dependencies.length}
          isLoading={false}
          emptyMessage="No dependencies defined."
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10, 25]} />
        </DataGrid>
      </DataGridContainer>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Dependency</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>
                Predecessor <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={taskOptions}
                value={watchedPredecessorId}
                onValueChange={(v) => {
                  setValue('wtkPredecessorId', v);
                  setValue('wtkSuccessorId', '');
                }}
                placeholder="Select predecessor task..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Successor <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={successorOptions}
                value={watch('wtkSuccessorId')}
                onValueChange={(v) => setValue('wtkSuccessorId', v)}
                placeholder="Select successor task..."
                disabled={!watchedPredecessorId}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Dependency Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={DEPENDENCY_TYPE_OPTIONS}
                value={watchedDepType}
                onValueChange={(v) => setValue('dependencyType', v)}
                placeholder="Select type..."
              />
            </div>

            {watchedDepType === 'PARALLEL_JOIN' && (
              <div className="space-y-1.5">
                <Label htmlFor="dep-join-group">Join Group Code</Label>
                <Input
                  id="dep-join-group"
                  {...register('joinGroupCode')}
                  placeholder="e.g. PARALLEL_A"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="dep-required"
                checked={watch('isRequired')}
                onCheckedChange={(v) => setValue('isRequired', v)}
              />
              <Label htmlFor="dep-required">Required</Label>
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
