import { useMemo, useState } from 'react';
import { XCircle, Pencil, X } from 'lucide-react';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TimeOffWithTeamMemberDTO } from '@shared/dto/TimeOff';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface TimeOffManagementGridProps {
  timeOffs: TimeOffWithTeamMemberDTO[];
  loading: boolean;
  showCancelled: boolean;
  onEditClick: (timeOff: TimeOffWithTeamMemberDTO) => void;
  onCancelClick: (timeOff: TimeOffWithTeamMemberDTO) => void;
  onRowClick?: (timeOff: TimeOffWithTeamMemberDTO) => void;
}

/**
 * Get badge variant based on status name
 */
function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = statusName.toLowerCase();
  if (statusLower.includes('approved')) return 'success';
  if (statusLower.includes('tentative') || statusLower.includes('pending')) return 'secondary';
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return 'destructive';
  return 'outline';
}

/**
 * Check if a time-off can be cancelled
 */
function canCancel(timeOff: TimeOffWithTeamMemberDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  return !statusLower.includes('cancelled');
}

/**
 * Check if a time-off can be edited (only future time offs, not cancelled or rejected)
 */
function canEdit(timeOff: TimeOffWithTeamMemberDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);

  return startDate >= today;
}

export function TimeOffManagementGrid({
  timeOffs,
  loading,
  showCancelled,
  onEditClick,
  onCancelClick,
  onRowClick,
}: TimeOffManagementGridProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timeOffStartDate', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    try {
      const saved = sessionStorage.getItem('timeoff-mgmt-filters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Pre-filter by showCancelled (parent-controlled toggle, not a column filter)
  const filteredTimeOffs = useMemo(() => {
    if (showCancelled) return timeOffs;
    return timeOffs.filter((t) => t.statusId !== 4);
  }, [timeOffs, showCancelled]);

  // Derive filter options for DataGridColumnFilter
  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of timeOffs) {
      if (t.statusName) seen.set(t.statusName, t.statusName);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [timeOffs]);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of timeOffs) {
      if (t.categoryId !== null) seen.set(t.categoryName, t.categoryName);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [timeOffs]);

  const levelOptions = useMemo(() => {
    const unique = [...new Set(timeOffs.map((t) => t.reportLevel))].sort((a, b) => a - b);
    return unique.map((level) => ({ value: String(level), label: `Level ${level}` }));
  }, [timeOffs]);

  const columns = useMemo<ColumnDef<TimeOffWithTeamMemberDTO>[]>(
    () => [
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="WDID" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.workdayId}</span>
        ),
        size: 100,
        enableColumnFilter: true,
        filterFn: 'includesString',
        meta: { headerTitle: 'WDID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'teamMemberFullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        size: 180,
        enableColumnFilter: true,
        filterFn: 'includesString',
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'reportLevel',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Report Level" />,
        cell: ({ row }) => (
          <Badge variant="secondary">Level {row.original.reportLevel}</Badge>
        ),
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(String(row.original.reportLevel));
        },
        size: 120,
        meta: { headerTitle: 'Report Level', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.categoryName);
        },
        size: 150,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'timeOffStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.timeOffDays}</span>
        ),
        size: 70,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.statusName);
        },
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'changeLogCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changes" />,
        cell: ({ row }) => <span>{row.original.changeLogCount}</span>,
        size: 90,
        meta: { headerTitle: 'Changes', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const showEdit = canEdit(row.original);
          const showCancel = canCancel(row.original);

          if (!showEdit && !showCancel) return null;

          return (
            <div className="flex items-center gap-1">
              {showEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(row.original);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelClick(row.original);
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          );
        },
        size: 180,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    [onEditClick, onCancelClick]
  );

  const table = useReactTable({
    data: filteredTimeOffs,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: { pageSize: 30 },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        sessionStorage.setItem('timeoff-mgmt-filters', JSON.stringify(next));
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="space-y-4">
      {/* Column Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-col gap-1">
          <Label htmlFor="wdid-filter" className="text-sm text-muted-foreground">WDID</Label>
          <Input
            id="wdid-filter"
            placeholder="Filter by WDID..."
            value={(table.getColumn('workdayId')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('workdayId')?.setFilterValue(e.target.value)}
            className="h-8 w-[180px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name-filter" className="text-sm text-muted-foreground">Team Member</Label>
          <Input
            id="name-filter"
            placeholder="Filter by name..."
            value={(table.getColumn('teamMemberFullName')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('teamMemberFullName')?.setFilterValue(e.target.value)}
            className="h-8 w-[200px]"
          />
        </div>
        <div className="flex flex-col justify-end gap-1 self-end">
          <DataGridColumnFilter
            column={table.getColumn('categoryName')}
            title="Category"
            options={categoryOptions}
          />
        </div>
        <div className="flex flex-col justify-end gap-1 self-end">
          <DataGridColumnFilter
            column={table.getColumn('statusName')}
            title="Status"
            options={statusOptions}
          />
        </div>
        <div className="flex flex-col justify-end gap-1 self-end">
          <DataGridColumnFilter
            column={table.getColumn('reportLevel')}
            title="Report Level"
            options={levelOptions}
          />
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              sessionStorage.removeItem('timeoff-mgmt-filters');
            }}
            className="h-8 px-2 lg:px-3 self-end"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Data Grid */}
      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          onRowClick={onRowClick}
          tableLayout={{
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[30, 50, 100]} />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
