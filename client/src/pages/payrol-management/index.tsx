import { useState, useCallback } from 'react';
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
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { PayrolDTO } from '@shared/dto/Payrol';
import { PayrolFormDialog } from './PayrolFormDialog';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'Open' },
  { label: 'Closed', value: 'Closed' },
];

export function PayrolManagementPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrolDTO | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: payrols = [], isLoading } = useQuery<PayrolDTO[]>({
    queryKey: ['payrols'],
    queryFn: () => apiGet<PayrolDTO[]>('/api/payrol'),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payrols'] });
  }, [queryClient]);

  const closeMutation = useMutation({
    mutationFn: (prlId: number) =>
      apiPatch<PayrolDTO, Record<string, never>>(`/api/payrol/${prlId}/close`, {}),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Payrol period closed' });
      refresh();
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const dropMutation = useMutation({
    mutationFn: (prlId: number) => apiDelete(`/api/payrol/${prlId}`),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Payrol period dropped' });
      refresh();
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const columns: ColumnDef<PayrolDTO>[] = [
    {
      accessorKey: 'prlDescription',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
    },
    {
      accessorKey: 'prlMonth',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Month" />,
    },
    {
      accessorKey: 'prlYear',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Year" />,
    },
    {
      accessorKey: 'prlFrequency',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Frequency" />,
      cell: ({ row }) => row.original.prlFrequency ?? '-',
    },
    {
      accessorKey: 'prlStartDate',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
      cell: ({ row }) => formatUTCDate(row.original.prlStartDate),
    },
    {
      accessorKey: 'prlEndDate',
      header: ({ column }) => <DataGridColumnHeader column={column} title="End" />,
      cell: ({ row }) => formatUTCDate(row.original.prlEndDate),
    },
    {
      accessorKey: 'prlStatus',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.prlStatus),
      cell: ({ row }) => (
        <Badge variant={row.original.prlStatus === 'Open' ? 'success' : 'secondary'}>
          {row.original.prlStatus}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-2">
            {r.prlStatus === 'Open' && canCreate('PayrolManagement') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingRecord(r);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => closeMutation.mutate(r.prlId)}
                >
                  Close
                </Button>
              </>
            )}
            {r.prlStatus !== 'Closed' && canDelete('PayrolManagement') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => dropMutation.mutate(r.prlId)}
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
    data: payrols,
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

  if (!canRead('PayrolManagement')) {
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
          <ToolbarPageTitle>Payrol Management</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/payrol-hub" />
          {canCreate('PayrolManagement') && (
            <Button
              size="sm"
              onClick={() => {
                setEditingRecord(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Period
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>
      <Card className="min-w-0">
        <CardContent className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <DataGridColumnFilter
              column={table.getColumn('prlStatus')}
              title="Status"
              options={STATUS_OPTIONS}
            />
            {columnFilters.length > 0 && (
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2">
                Reset <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4">Loading...</div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={payrols.length} tableLayout={{ width: 'auto' }}>
                <DataGridTable />
                <DataGridPagination sizes={[10, 25, 50]} />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <PayrolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        onSuccess={refresh}
      />
    </div>
  );
}
