import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getCompensatoryTimesUser, deleteCompensatoryTime } from '@/services/compensatoryTime';
import { formatUTCDate } from '@/lib/utils';
import type { CompensatoryTimeDTO, CompStatus, CompType } from '@shared/dto/CompensatoryTime';

const STATUS_OPTIONS = [
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved',  value: 'APPROVED'  },
  { label: 'Rejected',  value: 'REJECTED'  },
];

const COMP_TYPE_OPTIONS = [
  { label: 'Earned', value: 'EARNED' },
  { label: 'Used',   value: 'USED'   },
];

interface SupervisorCompTimeGridProps {
  teamMemberId: number;
  refreshKey: number;
}

export function SupervisorCompTimeGrid({ teamMemberId, refreshKey }: SupervisorCompTimeGridProps) {
  const { toast } = useToast();

  const [records, setRecords]             = useState<CompensatoryTimeDTO[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(false);
  const [pagination, setPagination]       = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const selectedStatuses = useMemo(
    () => (columnFilters.find((f) => f.id === 'status')?.value ?? []) as CompStatus[],
    [columnFilters],
  );

  const serverCompType = useMemo((): CompType | undefined => {
    const vals = (columnFilters.find((f) => f.id === 'compType')?.value ?? []) as CompType[];
    return vals.length === 1 ? vals[0] : undefined;
  }, [columnFilters]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : undefined;
      const result = await getCompensatoryTimesUser(
        pagination.pageIndex + 1,
        pagination.pageSize,
        serverCompType,
        selectedStatuses.length > 0 ? selectedStatuses : undefined,
        undefined,
        sort,
        teamMemberId,
      );
      setRecords(result.data);
      setTotal(result.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load records';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [pagination, sorting, serverCompType, selectedStatuses, teamMemberId, toast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [refreshKey, teamMemberId]);

  const handleDelete = async (id: number) => {
    try {
      await deleteCompensatoryTime(id);
      toast({ title: 'Deleted', description: 'Record deleted successfully.' });
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<CompensatoryTimeDTO>[]>(() => [
    {
      accessorKey: 'startingTime',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
      cell: ({ row }) => formatUTCDate(String(row.original.startingTime)),
    },
    {
      accessorKey: 'endingTime',
      header: ({ column }) => <DataGridColumnHeader column={column} title="End" />,
      cell: ({ row }) => formatUTCDate(String(row.original.endingTime)),
    },
    {
      accessorKey: 'projectName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
      cell: ({ row }) => row.original.projectName ?? '—',
    },
    {
      accessorKey: 'subject',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
    },
    {
      accessorKey: 'compType',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
      filterFn: (row, _, filterValues: string[]) =>
        filterValues.length === 0 || filterValues.includes(row.original.compType),
    },
    {
      accessorKey: 'totalCreditedHours',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Hours" />,
      cell: ({ row }) => row.original.totalCreditedHours.toFixed(2),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      filterFn: (row, _, filterValues: string[]) =>
        filterValues.length === 0 || filterValues.includes(row.original.status),
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'SUBMITTED' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.compensatoryTimeId)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : null,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const table = useReactTable({
    data: records,
    columns,
    pageCount: Math.ceil(total / pagination.pageSize),
    state: { pagination, sorting, columnFilters },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          Team Member Records
        </CardTitle>

        <div className="flex items-center gap-2 mb-4">
          <DataGridColumnFilter
            column={table.getColumn('compType')}
            title="Type"
            options={COMP_TYPE_OPTIONS}
          />
          <DataGridColumnFilter
            column={table.getColumn('status')}
            title="Status"
            options={STATUS_OPTIONS}
          />
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              className="h-8 px-2 lg:px-3"
              onClick={() => table.resetColumnFilters()}
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <DataGridContainer>
            <DataGrid>
              <DataGridTable table={table} />
            </DataGrid>
            <DataGridPagination table={table} />
          </DataGridContainer>
        )}
      </CardContent>
    </Card>
  );
}
