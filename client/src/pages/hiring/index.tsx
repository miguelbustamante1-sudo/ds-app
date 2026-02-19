import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { EndorsementWithDetailsDTO, HiringDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUTCDate } from '@/lib/utils';
import { useHiring } from './useHiring';

type TabValue = 'draft' | 'execute';

export function HiringPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') ?? 'draft') as TabValue;

  const { draftList, pendingList, loading, loadAll } = useHiring();

  useEffect(() => {
    loadAll();
  }, []);

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: false });
  }

  // ── Draft columns ─────────────────────────────────────────────────────────
  const draftColumns = useMemo<ColumnDef<EndorsementWithDetailsDTO>[]>(
    () => [
      {
        id: 'candidateName',
        accessorFn: (row) => `${row.candidateFirstName} ${row.candidateLastName}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Candidate Name" />,
        size: 220,
        meta: { headerTitle: 'Candidate Name', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'projectName',
        accessorFn: (row) => row.project?.projectName ?? '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        size: 220,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'clientManagerEmail',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Manager Email" />,
        size: 260,
        meta: { headerTitle: 'Manager Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
    ],
    [],
  );

  const draftTable = useReactTable({
    data: draftList,
    columns: draftColumns,
    initialState: { pagination: { pageSize: 5 } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // ── Pending columns ───────────────────────────────────────────────────────
  const pendingColumns = useMemo<ColumnDef<HiringDTO>[]>(
    () => [
      {
        id: 'candidateName',
        accessorFn: (row) =>
          `${row.endorsement.candidateFirstName} ${row.endorsement.candidateLastName}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Candidate Name" />,
        size: 220,
        meta: { headerTitle: 'Candidate Name', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        id: 'projectName',
        accessorFn: (row) => row.endorsement.project?.projectName ?? '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        size: 220,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Hiring Start Date" />,
        cell: ({ row }) => (row.original.startDate ? formatUTCDate(row.original.startDate) : '-'),
        size: 180,
        meta: { headerTitle: 'Hiring Start Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => row.original.workdayId ?? '-',
        size: 160,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [],
  );

  const pendingTable = useReactTable({
    data: pendingList,
    columns: pendingColumns,
    initialState: { pagination: { pageSize: 5 } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Hiring</ToolbarPageTitle>
          <ToolbarDescription>Manage candidate hirings</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="draft">
            Ready to Draft
            {draftList.length > 0 && (
              <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {draftList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="execute">
            Pending Execution
            {pendingList.length > 0 && (
              <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {pendingList.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draft">
          <DataGridContainer className="mt-4">
            <DataGrid
              table={draftTable}
              recordCount={draftList.length}
              isLoading={loading}
              emptyMessage="No approved endorsements available to draft."
              onRowClick={(row) => navigate(`/hiring/new?endorsementId=${row.endorsementId}`)}
            >
              <DataGridTable />
              <DataGridPagination sizes={[5, 10, 25]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>

        <TabsContent value="execute">
          <DataGridContainer className="mt-4">
            <DataGrid
              table={pendingTable}
              recordCount={pendingList.length}
              isLoading={loading}
              emptyMessage="No pending hirings found."
              onRowClick={(row) => navigate(`/hiring/${row.id}`)}
            >
              <DataGridTable />
              <DataGridPagination sizes={[5, 10, 25]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
