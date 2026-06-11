import { useState } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { buildLeaderboardColumns } from './leaderboardColumns';
import { CandidateDetailPanel } from './CandidateDetailPanel';
import { CommitteeDecisionPanel } from './CommitteeDecisionPanel';
import { resultsApi } from '@/api/topPerformers/results';
import type { LeaderboardEntry } from '@/api/topPerformers/results';
import { cyclesApi } from '@/api/topPerformers/cycles';

export default function CommitteePage() {
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const cycId = activeCycle?.cycId;

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['tp-leaderboard', cycId],
    queryFn: () => resultsApi.getLeaderboard(cycId!),
    enabled: !!cycId,
  });

  const columns = buildLeaderboardColumns(setSelectedEntry);

  const table = useReactTable({
    data: leaderboard,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (!activeCycle) return <div className="p-6 text-muted-foreground">No active cycle.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Top Performers Results — {activeCycle.cycName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => cycId && resultsApi.exportCsv(cycId)}>
                Export CSV
              </Button>
              <Button onClick={() => setShowDecision(true)}>Committee Decision</Button>
            </div>
          </div>

          <DataGrid table={table} loading={isLoading}>
            <DataGridContainer>
              <DataGridTable />
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        </CardContent>
      </Card>

      {selectedEntry && cycId && (
        <CandidateDetailPanel
          cycId={cycId}
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {showDecision && cycId && (
        <CommitteeDecisionPanel
          cycId={cycId}
          leaderboard={leaderboard}
          onClose={() => setShowDecision(false)}
        />
      )}
    </div>
  );
}
