import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading, ToolbarPageTitle, ToolbarDescription } from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { apiGet } from '@/lib/api';
import { TimeOffHubScopeToggle } from '../components/TimeOffHubScopeToggle';
import { buildSummaryColumns, type TimeOffHubSummaryRecord } from './summaryColumns';

type TimeOffHubSummaryScope = 'direct' | 'hierarchy';
type TimeOffHubSummaryTab = 'upcoming-timeoff' | 'upcoming-swaps' | 'this-week';

const TAB_LABELS: Record<TimeOffHubSummaryTab, string> = {
  'upcoming-timeoff': 'Upcoming Time Off',
  'upcoming-swaps': 'Upcoming Holiday Swaps',
  'this-week': 'This Week',
};

const TYPE_OPTIONS = [
  { label: 'Time Off', value: 'TimeOff' },
  { label: 'Holiday Swap', value: 'HolidaySwap' },
];

function parseTab(raw: string | null): TimeOffHubSummaryTab {
  if (raw === 'upcoming-swaps' || raw === 'this-week') return raw;
  return 'upcoming-timeoff';
}

function parseScope(raw: string | null): TimeOffHubSummaryScope {
  return raw === 'hierarchy' ? 'hierarchy' : 'direct';
}

function fetchSummaryRecords(
  tab: TimeOffHubSummaryTab,
  scope: TimeOffHubSummaryScope,
): Promise<TimeOffHubSummaryRecord[]> {
  return apiGet<TimeOffHubSummaryRecord[]>(`/api/time-off-hub/summary/records?tab=${tab}&scope=${scope}`);
}

export default function TimeOffHubSummaryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const tab = parseTab(searchParams.get('tab'));
  const scope = parseScope(searchParams.get('scope'));

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['time-off-hub-summary-records', tab, scope],
    queryFn: () => fetchSummaryRecords(tab, scope),
  });

  // Column filters (e.g. a Type value) don't necessarily make sense across
  // a tab switch, since the record set and columns change underneath them.
  useEffect(() => {
    setColumnFilters([]);
  }, [tab]);

  const columns = useMemo(() => buildSummaryColumns(tab === 'this-week'), [tab]);

  const statusOptions = useMemo(() => {
    const unique = new Set(records.map((r) => r.statusName));
    return Array.from(unique).map((label) => ({ label, value: label }));
  }, [records]);

  const table = useReactTable({
    data: records,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleTabChange(next: string) {
    setSearchParams({ tab: next, scope });
  }

  function handleScopeChange(hierarchy: boolean) {
    setSearchParams({ tab, scope: hierarchy ? 'hierarchy' : 'direct' });
  }

  function handleRowClick(record: TimeOffHubSummaryRecord) {
    const currentUrl = `/time-off-hub/summary?tab=${tab}&scope=${scope}`;
    const target = record.type === 'TimeOff'
      ? `/timeoff-detail/${record.recordId}?from=${encodeURIComponent(currentUrl)}`
      : `/holiday-swaps/${record.recordId}?from=${encodeURIComponent(currentUrl)}`;
    navigate(target);
  }

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Time Off Hub Summary</ToolbarPageTitle>
          <ToolbarDescription>
            Drill into your team's upcoming time off, holiday swaps, and this week's activity.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Card className="mt-4">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{TAB_LABELS[tab]}</CardTitle>
            <TimeOffHubScopeToggle checked={scope === 'hierarchy'} onCheckedChange={handleScopeChange} />
          </div>

          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList variant="line">
              <TabsTrigger value="upcoming-timeoff">Upcoming Time Off</TabsTrigger>
              <TabsTrigger value="upcoming-swaps">Upcoming Holiday Swaps</TabsTrigger>
              <TabsTrigger value="this-week">This Week</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <DataGridColumnFilter column={table.getColumn('statusName')} title="Status" options={statusOptions} />
                {tab === 'this-week' && (
                  <DataGridColumnFilter column={table.getColumn('type')} title="Type" options={TYPE_OPTIONS} />
                )}
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
                  <DataGrid table={table} recordCount={records.length} onRowClick={handleRowClick}>
                    <DataGridTable />
                    <DataGridPagination sizes={[10, 25, 50]} />
                  </DataGrid>
                </DataGridContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
