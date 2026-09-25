import { useMemo, useState } from 'react';
import {
  type ColumnFiltersState,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Loader2, Trash2, X } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { BackToHubButton } from '@/components/BackToHubButton';
import type { AdminTriviaQuestionDTO, TriviaBatchStatusDTO, UpdateTriviaQuestionDTO } from '@shared/dto';

const QUESTIONS_QUERY_KEY = ['trivia-admin-questions'];
const BATCH_STATUS_QUERY_KEY = ['trivia-admin-latest-batch'];

function fetchQuestions(): Promise<AdminTriviaQuestionDTO[]> {
  return apiGet<AdminTriviaQuestionDTO[]>('/api/trivia/questions');
}

function fetchLatestBatch(): Promise<TriviaBatchStatusDTO | null> {
  return apiGet<TriviaBatchStatusDTO | null>('/api/trivia/batches/latest');
}

export default function TriviaManageQuestionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const { data: questions = [], isLoading } = useQuery({
    queryKey: QUESTIONS_QUERY_KEY,
    queryFn: fetchQuestions,
  });

  const { data: latestBatch } = useQuery({
    queryKey: BATCH_STATUS_QUERY_KEY,
    queryFn: fetchLatestBatch,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
  });

  const isPulling = latestBatch?.status === 'pending';

  const pullBatchMutation = useMutation({
    mutationFn: () => apiPost<{ batchId: number }>('/api/trivia/batches', {}),
    onSuccess: () => {
      toast({ title: 'Batch started', description: 'Pulling up to 30 new questions from the knowledge base…' });
      queryClient.invalidateQueries({ queryKey: BATCH_STATUS_QUERY_KEY });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start a new trivia batch',
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiPatch<AdminTriviaQuestionDTO, UpdateTriviaQuestionDTO>(`/api/trivia/questions/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update question', variant: 'destructive' });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/trivia/questions/${id}`),
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Trivia question removed' });
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete question', variant: 'destructive' });
    },
  });

  const columns = useMemo<ColumnDef<AdminTriviaQuestionDTO>[]>(
    () => [
      {
        accessorKey: 'questionText',
        header: 'Question',
        size: 400,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => row.toggleExpanded()}
            className="flex w-full items-start gap-2 text-left"
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? 'Collapse answers' : 'Show answers'}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span>{row.original.questionText}</span>
          </button>
        ),
        meta: {
          cellClassName: 'whitespace-normal break-words align-top',
          expandedContent: (question: AdminTriviaQuestionDTO) => (
            <ol className="grid grid-cols-1 gap-2 py-2 ps-6 sm:grid-cols-2">
              {question.options.map((option, index) => {
                const isCorrect = index === question.correctOptionIndex;
                return (
                  <li
                    key={index}
                    className={
                      isCorrect
                        ? 'flex items-center gap-2 rounded-lg border border-uds-system-green-500 bg-uds-system-green-100 px-3 py-2 text-sm text-uds-system-green-700'
                        : 'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground'
                    }
                  >
                    {isCorrect && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span>{option}</span>
                  </li>
                );
              })}
            </ol>
          ),
        },
        filterFn: (row, columnId, filterValue: string) =>
          String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase()),
      },
      {
        accessorKey: 'options',
        header: 'Correct Answer',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.options[row.original.correctOptionIndex]}
          </span>
        ),
      },
      {
        accessorKey: 'batchId',
        header: 'Batch',
        cell: ({ row }) => <Badge variant="secondary">#{row.original.batchId}</Badge>,
      },
      {
        accessorKey: 'isActive',
        header: 'Active',
        cell: ({ row }) => (
          <Switch
            checked={row.original.isActive}
            onCheckedChange={(checked) =>
              toggleActiveMutation.mutate({ id: row.original.id, isActive: checked })
            }
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteQuestionMutation.mutate(row.original.id)}
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [toggleActiveMutation, deleteQuestionMutation],
  );

  const table = useReactTable({
    data: questions,
    columns,
    state: { columnFilters, expanded },
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Manage Trivia Questions</ToolbarPageTitle>
          <ToolbarDescription>
            {questions.length} question{questions.length === 1 ? '' : 's'} in the pool
            {latestBatch ? ` · last batch: ${latestBatch.status}` : ''}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/trivia-hub" />
          <Button onClick={() => pullBatchMutation.mutate()} disabled={isPulling || pullBatchMutation.isPending}>
            {isPulling ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Pulling questions…
              </>
            ) : (
              'Pull 30 Questions'
            )}
          </Button>
        </ToolbarActions>
      </Toolbar>

      {latestBatch?.status === 'failed' && (
        <div className="mb-4 rounded-lg border border-uds-system-red-500 bg-uds-system-red-100 px-4 py-3 text-sm text-uds-system-red-700">
          Last batch failed: {latestBatch.errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search questions..."
          value={(table.getColumn('questionText')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('questionText')?.setFilterValue(e.target.value)}
          className="h-8 w-[240px]"
        />
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer>
          <DataGrid table={table} recordCount={questions.length} tableLayout={{ columnsResizable: true }}>
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
