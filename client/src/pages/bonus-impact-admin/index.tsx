import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { BackToHubButton } from '@/components/BackToHubButton';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPatch } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { BonusImpactDTO } from '@shared/dto/BonusImpact';
import { BonusImpactFormDialog } from '../bonus-impact/BonusImpactFormDialog';
import { ProcessDialog } from './ProcessDialog';

const STATUS_OPTIONS = [
  { label: 'Registered', value: 'Registered' },
  { label: 'Notified', value: 'Notified' },
  { label: 'Processed', value: 'Processed' },
  { label: 'Dropped', value: 'Dropped' },
];

interface TeamMemberOption {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

export function BonusImpactAdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: impacts = [], isLoading } = useQuery<BonusImpactDTO[]>({
    queryKey: ['bonus-impacts', 'admin'],
    queryFn: () => apiGet<BonusImpactDTO[]>('/api/bonus-impacts/all'),
  });

  const { data: allTeamMembers = [] } = useQuery<TeamMemberOption[]>({
    queryKey: ['team-members-for-bonus-impact-admin'],
    queryFn: () => apiGet<TeamMemberOption[]>('/api/team-members'),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['bonus-impacts'] });
  }, [queryClient]);

  const notifyMutation = useMutation({
    mutationFn: (id: number) =>
      apiPatch<BonusImpactDTO, Record<string, never>>(`/api/bonus-impacts/${id}/notify`, {}),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Marked as Notified' });
      refresh();
    },
    onError: (err: Error) =>
      toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const dropMutation = useMutation({
    mutationFn: (id: number) =>
      apiPatch<BonusImpactDTO, Record<string, never>>(`/api/bonus-impacts/${id}/drop`, {}),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Bonus impact dropped' });
      refresh();
    },
    onError: (err: Error) =>
      toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const memberOptions = useMemo(
    () =>
      Array.from(
        new Map(
          impacts.map((i) => [
            i.bniTeamMemberId,
            {
              value: String(i.bniTeamMemberId),
              label: `${i.teamMemberNames} ${i.teamMemberSurnames}`,
            },
          ])
        ).values()
      ),
    [impacts]
  );

  const columns: ColumnDef<BonusImpactDTO>[] = [
    {
      accessorKey: 'bniTeamMemberId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
      filterFn: (row, _, filterValues: string[]) =>
        filterValues.includes(String(row.original.bniTeamMemberId)),
      cell: ({ row }) => `${row.original.teamMemberNames} ${row.original.teamMemberSurnames}`,
    },
    {
      accessorKey: 'bniDescription',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
    },
    {
      accessorKey: 'bniAmount',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => `${row.original.bniAmount} ${row.original.bniCurrency}`,
    },
    {
      accessorKey: 'bniMonth',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Month" />,
      cell: ({ row }) => formatUTCDate(row.original.bniMonth),
    },
    {
      accessorKey: 'bniFrequency',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Frequency" />,
      cell: ({ row }) => row.original.bniFrequency ?? '-',
    },
    {
      accessorKey: 'bniStatus',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.bniStatus),
      cell: ({ row }) => <Badge variant="outline">{row.original.bniStatus}</Badge>,
    },
    {
      accessorKey: 'bniPrlId',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Payrol Period" />,
      cell: ({ row }) => row.original.bniPrlId ?? '—',
    },
    {
      accessorKey: 'bniNotifiedAt',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Notified" />,
      cell: ({ row }) =>
        row.original.bniNotifiedAt ? formatUTCDate(row.original.bniNotifiedAt) : '—',
    },
    {
      accessorKey: 'bniProcessedAt',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Processed" />,
      cell: ({ row }) =>
        row.original.bniProcessedAt ? formatUTCDate(row.original.bniProcessedAt) : '—',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-2">
            {r.bniStatus === 'Registered' && canCreate('BonusImpact') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => notifyMutation.mutate(r.bniId)}
              >
                Notify
              </Button>
            )}
            {r.bniStatus === 'Notified' && canCreate('BonusImpact') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setProcessingId(r.bniId);
                  setProcessOpen(true);
                }}
              >
                Process
              </Button>
            )}
            {(r.bniStatus === 'Registered' || r.bniStatus === 'Notified') && canDelete('BonusImpact') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => dropMutation.mutate(r.bniId)}
              >
                Drop
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: impacts,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  if (!canRead('BonusImpact')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Bonus Impact Admin</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/payrol-hub" />
          {canCreate('BonusImpact') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Register Impact
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>
      <Card className="min-w-0">
        <CardContent className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <DataGridColumnFilter
              column={table.getColumn('bniTeamMemberId')}
              title="Team Member"
              options={memberOptions}
            />
            <DataGridColumnFilter
              column={table.getColumn('bniStatus')}
              title="Status"
              options={STATUS_OPTIONS}
            />
            {columnFilters.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2"
              >
                Reset <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={impacts.length} tableLayout={{ width: 'auto' }}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <BonusImpactFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        directReports={allTeamMembers}
        onSuccess={refresh}
      />

      <ProcessDialog
        open={processOpen}
        onOpenChange={setProcessOpen}
        bniId={processingId}
        onSuccess={refresh}
      />
    </div>
  );
}
