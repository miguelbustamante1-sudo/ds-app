import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { BackToHubButton } from '@/components/BackToHubButton';
import { ComboBox } from '@/components/ui/combobox';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { NomineeDetailSheet } from './NomineeDetailSheet';
import { buildNominationColumns } from './nomineeColumns';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { nominationsApi } from '@/api/topPerformers/nominations';
import { formatUTCDate } from '@/lib/utils';
import type { TpNominationAdminDTO } from '@/api/topPerformers/nominations';

export default function NominationsOverviewPage() {
  const [selectedCycId, setSelectedCycId] = useState<number | null>(null);
  const [selected, setSelected] = useState<TpNominationAdminDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: cycles = [] } = useQuery({
    queryKey: ['tp-cycles'],
    queryFn: cyclesApi.getAll,
  });

  const { data: nominations = [], isLoading } = useQuery<TpNominationAdminDTO[]>({
    queryKey: ['tp-nominations-admin', selectedCycId],
    queryFn: () => nominationsApi.getAdminView(selectedCycId!),
    enabled: selectedCycId !== null,
  });

  const cycleOptions = useMemo(
    () =>
      [...cycles]
        .sort((a, b) => new Date(b.cycNominationsStart).getTime() - new Date(a.cycNominationsStart).getTime())
        .map((c) => ({
          value: String(c.cycId),
          label: `${c.cycName} — ${formatUTCDate(c.cycNominationsStart)}`,
        })),
    [cycles]
  );

  const columns = useMemo(() => buildNominationColumns(setSelected), []);

  const table = useReactTable({
    data: nominations,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="p-6 space-y-4">
      <BackToHubButton hubPath="/top-performers-hub" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <CardTitle>Nominations Overview</CardTitle>
          <div className="max-w-sm">
            <ComboBox
              options={cycleOptions}
              value={selectedCycId !== null ? String(selectedCycId) : ''}
              onValueChange={(v) => setSelectedCycId(parseInt(v, 10))}
              placeholder="Select a cycle..."
            />
          </div>
          {selectedCycId === null && (
            <p className="text-sm text-muted-foreground py-4">Select a cycle to view nominations.</p>
          )}
          {selectedCycId !== null && isLoading && (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          )}
          {selectedCycId !== null && !isLoading && (
            <DataGridContainer>
              <DataGrid table={table} recordCount={nominations.length}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      {selected && (
        <NomineeDetailSheet
          nomination={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
