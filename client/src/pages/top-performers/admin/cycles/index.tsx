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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cyclesApi } from '@/api/topPerformers/cycles';
import type { TpCycleDTO } from '@/api/topPerformers/cycles';
import { TP_CYCLE_STATUSES } from '@shared/dto/TopPerformersCycle';
import { cycleColumns, NEXT_STATUS, STATUS_LABELS } from './cycleColumns';
import { CycleFormDialog } from './CycleFormDialog';
import { CycleEditDialog } from './CycleEditDialog';
import { BackToHubButton } from '@/components/BackToHubButton';

const STATUS_OPTIONS = TP_CYCLE_STATUSES.map((s) => ({
  label: STATUS_LABELS[s],
  value: s,
}));

export function TpCyclesPage() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<TpCycleDTO | null>(null);
  const [advancingCycle, setAdvancingCycle] = useState<TpCycleDTO | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const queryClient = useQueryClient();

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['tp-cycles'],
    queryFn: () => cyclesApi.getAll(),
  });

  const handleSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['tp-cycles'] });
    void queryClient.invalidateQueries({ queryKey: ['tp-active-cycle'] });
  };

  const handleConfirmAdvance = async () => {
    if (!advancingCycle) return;
    const nextStatus = NEXT_STATUS[advancingCycle.cycStatus];
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      await cyclesApi.updateStatus(advancingCycle.cycId, nextStatus);
      toast({ title: `Cycle moved to "${STATUS_LABELS[nextStatus]}"` });
      handleSuccess();
      setAdvancingCycle(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error updating status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

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
    meta: {
      onEdit: (cycle: TpCycleDTO) => setEditingCycle(cycle),
      onAdvance: (cycle: TpCycleDTO) => setAdvancingCycle(cycle),
    },
  });

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Top Performers Cycles</ToolbarPageTitle>
          <ToolbarDescription>Manage nomination and voting cycles</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/top-performers-hub" />
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

      {editingCycle && (
        <CycleEditDialog
          cycle={editingCycle}
          open={!!editingCycle}
          onOpenChange={(open) => { if (!open) setEditingCycle(null); }}
          onSuccess={() => {
            handleSuccess();
            setEditingCycle(null);
          }}
        />
      )}

      <Dialog
        open={!!advancingCycle}
        onOpenChange={(open) => { if (!open) setAdvancingCycle(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance cycle status</DialogTitle>
          </DialogHeader>
          {advancingCycle && (
            <p className="text-sm text-muted-foreground">
              Move <strong>{advancingCycle.cycName}</strong> from{' '}
              <strong>{STATUS_LABELS[advancingCycle.cycStatus]}</strong> to{' '}
              <strong>{STATUS_LABELS[NEXT_STATUS[advancingCycle.cycStatus]] ?? ''}</strong>?
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdvancingCycle(null)}
              disabled={advancing}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAdvance} disabled={advancing}>
              {advancing ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
