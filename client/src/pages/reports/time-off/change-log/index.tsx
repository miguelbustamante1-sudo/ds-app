import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
  type ColumnPinningState,
} from '@tanstack/react-table';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useChangeLogReport } from './useChangeLogReport';
import { useChangeLogColumns } from './columns';
import { TABS, type TabId } from './tabs';
import { ChangeLogFilters } from './filters';
import { ExportButton } from '../../components/ExportButton';

const DEFAULT_PAGE_SIZE = 25;

export function TimeOffChangeLogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Active tab ──────────────────────────────────────────────────────────────
  const activeTabId = (searchParams.get('tab') ?? 'employee') as TabId;
  const activeTab = TABS.find((t) => t.id === activeTabId) ?? TABS[0];

  // ── Pagination ──────────────────────────────────────────────────────────────
  const pageIndex = Math.max(0, Number(searchParams.get('page') ?? 0));
  const pageSize = Math.max(1, Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE));
  const pagination: PaginationState = { pageIndex, pageSize };

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const sortBy = searchParams.get('sortBy');
  const sortDir = searchParams.get('sortDir');
  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortDir === 'desc' }]
    : activeTab.defaultSort;

  // ── Column pinning ──────────────────────────────────────────────────────────
  const columnPinning: ColumnPinningState = {
    left: activeTab.pinnedLeft,
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, total, isLoading, isError } = useChangeLogReport(searchParams);
  const columns = useChangeLogColumns();

  // ── Table ───────────────────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnPinning },
    pageCount: Math.ceil(total / pageSize),
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (next.length > 0) {
          p.set('sortBy', next[0].id);
          p.set('sortDir', next[0].desc ? 'desc' : 'asc');
        } else {
          p.delete('sortBy');
          p.delete('sortDir');
        }
        p.set('page', '0');
        return p;
      });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('page', String(next.pageIndex));
        p.set('pageSize', String(next.pageSize));
        return p;
      });
    },
  });

  // ── Tab switch ──────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tabId: string) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', tabId);
        // Reset sort + page; filters are preserved
        p.delete('sortBy');
        p.delete('sortDir');
        p.set('page', '0');
        return p;
      });
    },
    [setSearchParams],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      {/* Toolbar */}
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" />
              Reports
            </Button>
            <span className="text-muted-foreground">/</span>
            <ToolbarPageTitle>Time Off Change Log</ToolbarPageTitle>
          </div>
        </ToolbarHeading>
        <ToolbarActions>
          <ExportButton
            searchParams={searchParams}
            baseEndpoint="/api/reports/time-off/change-log"
            filenamePrefix={`timeoff-changelog-${activeTabId}`}
          />
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 space-y-4">
        {/* Dimension tabs */}
        <Tabs value={activeTabId} onValueChange={handleTabChange}>
          <TabsList variant="line">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filter bar */}
        <ChangeLogFilters />

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            Failed to load data. Check your filters and try again.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && (
          <>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} record{total !== 1 ? 's' : ''} found
            </p>
            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={total}
                tableLayout={{
                  columnsResizable: true,
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
              >
                <div className="overflow-x-auto">
                  <DataGridTable />
                </div>
                <DataGridPagination sizes={[25, 50, 100]} />
              </DataGrid>
            </DataGridContainer>
          </>
        )}
      </div>
    </div>
  );
}
