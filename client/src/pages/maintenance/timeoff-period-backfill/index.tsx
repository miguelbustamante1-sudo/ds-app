import { useEffect, useMemo, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type {
  TimeOffPeriodMaintenanceDTO,
  UpdateTimeOffPeriodMaintenanceDTO,
} from '@shared/dto';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { formatUTCDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPut } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const BACKFILLED_OPTIONS = [
  { label: 'Pending', value: '0' },
  { label: 'Absorbed by Workday', value: '1' },
];

const formatDate = (val: string | null) => (val ? formatUTCDate(val) : '-');

const formatMember = (row: TimeOffPeriodMaintenanceDTO) => {
  if (!row.teamMemberNames) return '-';
  const name = `${row.teamMemberNames} ${row.teamMemberSurnames ?? ''}`.trim();
  return row.workdayId ? `${row.workdayId} - ${name}` : name;
};

export function TimeOffPeriodBackfillPage() {
  const [items, setItems] = useState<TimeOffPeriodMaintenanceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TimeOffPeriodMaintenanceDTO | null>(null);
  const [editPeriod, setEditPeriod] = useState('');
  const [editBackfilled, setEditBackfilled] = useState(0);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  useEffect(() => {
    if (!canRead('TimeOffPeriodMaintenance')) return;
    setLoading(true);
    apiGet<TimeOffPeriodMaintenanceDTO[]>('/api/timeoff-period-maintenance')
      .then(setItems)
      .catch((err: Error) =>
        toast({ title: 'Error', description: err.message, variant: 'destructive' })
      )
      .finally(() => setLoading(false));
  }, []);

  const handleEditOpen = (row: TimeOffPeriodMaintenanceDTO) => {
    setEditing(row);
    setEditPeriod(row.timeOffPeriod ?? '');
    setEditBackfilled(row.timeOffBackfilled);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: UpdateTimeOffPeriodMaintenanceDTO = {
        timeOffPeriod: editPeriod.trim() || null,
        timeOffBackfilled: editBackfilled,
      };
      const updated = await apiPut<TimeOffPeriodMaintenanceDTO>(
        `/api/timeoff-period-maintenance/${editing.timeOffId}`,
        payload
      );
      setItems((prev) => prev.map((i) => (i.timeOffId === updated.timeOffId ? updated : i)));
      toast({ title: 'Success', description: 'Record updated successfully' });
      setEditOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const memberOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((item) => {
      if (item.teamMemberId) {
        unique.set(item.teamMemberId.toString(), formatMember(item));
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [items]);

  const periodOptions = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.timeOffPeriod) unique.add(item.timeOffPeriod);
    });
    return Array.from(unique)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [items]);

  const columns = useMemo<ColumnDef<TimeOffPeriodMaintenanceDTO>[]>(
    () => [
      {
        id: 'teamMember',
        accessorFn: (row) => formatMember(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => formatMember(row.original),
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.teamMemberId?.toString() ?? '');
        },
        size: 240,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'timeOffStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
        cell: ({ row }) => formatDate(row.original.timeOffStartDate),
        size: 110,
        meta: { headerTitle: 'Start', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End" />,
        cell: ({ row }) => formatDate(row.original.timeOffEndDate),
        size: 110,
        meta: { headerTitle: 'End', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => row.original.timeOffDays,
        size: 70,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => row.original.statusName ?? '-',
        size: 110,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffPeriod',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Period" />,
        cell: ({ row }) => row.original.timeOffPeriod ?? '-',
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.timeOffPeriod ?? '');
        },
        size: 110,
        meta: { headerTitle: 'Period', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffBackfilled',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.timeOffBackfilled === 1 ? 'Absorbed by Workday' : 'Pending',
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.timeOffBackfilled.toString());
        },
        size: 160,
        meta: { headerTitle: 'Workday Status', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canCreate('TimeOffPeriodMaintenance') ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleEditOpen(row.original)}>
                <Pencil size={16} />
              </Button>
            </div>
          ) : null,
        size: 70,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-8 ml-auto" />,
        },
      },
    ],
    [canCreate]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;

  if (!canRead('TimeOffPeriodMaintenance')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Vacation Period Maintenance</ToolbarPageTitle>
          <ToolbarDescription>
            Manage vacation period and Workday backfill status per request
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('teamMember') && (
          <DataGridColumnFilter
            column={table.getColumn('teamMember')}
            title="Team Member"
            options={memberOptions}
          />
        )}
        {table.getColumn('timeOffPeriod') && (
          <DataGridColumnFilter
            column={table.getColumn('timeOffPeriod')}
            title="Period"
            options={periodOptions}
          />
        )}
        {table.getColumn('timeOffBackfilled') && (
          <DataGridColumnFilter
            column={table.getColumn('timeOffBackfilled')}
            title="Workday Status"
            options={BACKFILLED_OPTIONS}
          />
        )}
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

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={items.length}
          isLoading={loading}
          emptyMessage="No vacation time-off records found."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Period & Backfill Status</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {formatMember(editing)} &mdash; {formatDate(editing.timeOffStartDate)} to{' '}
                {formatDate(editing.timeOffEndDate)} ({editing.timeOffDays} days)
              </p>

              <div className="space-y-2">
                <Label htmlFor="edit-period">Period (YYYY-YYYY)</Label>
                <Input
                  id="edit-period"
                  value={editPeriod}
                  onChange={(e) => setEditPeriod(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  maxLength={9}
                />
              </div>

              <div className="space-y-2">
                <Label>Workday Status</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={editBackfilled === 0 ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setEditBackfilled(0)}
                  >
                    Pending
                  </Button>
                  <Button
                    type="button"
                    variant={editBackfilled === 1 ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setEditBackfilled(1)}
                  >
                    Absorbed by Workday
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
