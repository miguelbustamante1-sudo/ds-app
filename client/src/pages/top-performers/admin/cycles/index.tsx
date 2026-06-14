import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { cycleColumns } from './cycleColumns';
import { CycleFormDialog } from './CycleFormDialog';

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Nominations Open', value: 'NOMINATIONS_OPEN' },
  { label: 'Nominations Closed', value: 'NOMINATIONS_CLOSED' },
  { label: 'Voting Open', value: 'VOTING_OPEN' },
  { label: 'Voting Closed', value: 'VOTING_CLOSED' },
  { label: 'Results Published', value: 'RESULTS_PUBLISHED' },
];

export function TpCyclesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const queryClient = useQueryClient();

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['tp-cycles'],
    queryFn: () => cyclesApi.getAll(),
  });

  const table = useReactTable({
    data: cycles,
    columns: cycleColumns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['tp-cycles'] });
  };

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Top Performers Cycles</ToolbarPageTitle>
          <ToolbarDescription>Manage nomination and voting cycles</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} className="me-1" />
            New Cycle
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Card className="mt-4">
        <CardContent>
          <CardTitle className="mb-4">Cycles</CardTitle>

          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Search by name..."
              value={(table.getColumn('cycName')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('cycName')?.setFilterValue(e.target.value)}
              className="h-8 w-[180px]"
            />
            <DataGridColumnFilter
              column={table.getColumn('cycStatus')}
              title="Status"
              options={STATUS_OPTIONS}
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={cycles.length}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <CycleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
