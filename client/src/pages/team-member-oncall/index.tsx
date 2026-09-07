import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type {
  TeamMemberOncallDTO,
  CreateTeamMemberOncallDTO,
  UpdateTeamMemberOncallDTO,
  BulkDeleteTeamMemberOncallDTO,
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
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { formatUTCDate } from '@/lib/utils';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { BackToHubButton } from '@/components/BackToHubButton';
import { OncallFormDialog } from './form';
import { OncallImportDialog } from './import-dialog';

const formatTeamMemberDisplay = (
  teamMember: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string } | null,
) => {
  if (!teamMember) return '-';
  const name = `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`;
  return teamMember.workdayId ? `${teamMember.workdayId} - ${name}` : name;
};

const formatAmount = (amount: string) => {
  const value = Number(amount);
  return Number.isNaN(value) ? amount : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function TeamMemberOncallPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TeamMemberOncallDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<TeamMemberOncallDTO | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const oncalls = useEntityList<TeamMemberOncallDTO, CreateTeamMemberOncallDTO, UpdateTeamMemberOncallDTO>({
    endpoint: '/api/team-member-oncall',
    idKey: 'oncallId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    oncalls.loadItems();
  }, []);

  const handleEdit = (record: TeamMemberOncallDTO) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const handleDeleteClick = (record: TeamMemberOncallDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await oncalls.deleteItem(deletingRecord.oncallId);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
  };

  const handleBulkDeleteConfirm = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.oncallId);
    if (selectedIds.length === 0) {
      setBulkDeleteDialogOpen(false);
      return;
    }
    try {
      await apiPost<void, BulkDeleteTeamMemberOncallDTO>('/api/team-member-oncall/bulk-delete', {
        oncallIds: selectedIds,
      });
      toast({
        title: 'Success',
        description: `${selectedIds.length} on call record(s) deleted successfully.`,
      });
      setRowSelection({});
      oncalls.setItems((prev) => prev.filter((i) => !selectedIds.includes(i.oncallId)));
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete on call records',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const teamMemberOptions = useMemo(() => {
    const unique = new Map<string, string>();
    oncalls.items.forEach((item) => {
      if (item.teamMember) {
        unique.set(item.teamMember.teamMemberId.toString(), formatTeamMemberDisplay(item.teamMember));
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [oncalls.items]);

  const columns = useMemo<ColumnDef<TeamMemberOncallDTO>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 36,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'teamMember',
        accessorFn: (row) => formatTeamMemberDisplay(row.teamMember),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => formatTeamMemberDisplay(row.original.teamMember),
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.teamMember?.teamMemberId?.toString() ?? '');
        },
        size: 250,
      },
      {
        accessorKey: 'oncallAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => formatAmount(row.original.oncallAmount),
        size: 140,
      },
      {
        accessorKey: 'oncallDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Month" />,
        cell: ({ row }) => formatUTCDate(row.original.oncallDate),
        size: 140,
      },
      {
        id: 'payrol',
        accessorFn: (row) => (row.payrol ? `${row.payrol.prlDescription} (${row.payrol.prlMonth}/${row.payrol.prlYear})` : '-'),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Payrol Period" />,
        cell: ({ row }) =>
          row.original.payrol ? `${row.original.payrol.prlDescription} (${row.original.payrol.prlMonth}/${row.original.payrol.prlYear})` : '-',
        size: 180,
      },
      {
        accessorKey: 'oncallFrequency',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Frequency" />,
        cell: ({ row }) => row.original.oncallFrequency ?? '-',
        size: 120,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('PayrolManagement') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('PayrolManagement') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: oncalls.items,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.oncallId.toString(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;
  const selectedCount = table.getSelectedRowModel().rows.length;

  if (!canRead('PayrolManagement')) {
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
          <ToolbarPageTitle>Team Member On Call</ToolbarPageTitle>
          <ToolbarDescription>Register and track on call payments made to team members</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/payrol-hub" />
          {canCreate('PayrolManagement') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload size={16} className="me-1" />
              Import
            </Button>
          )}
          {canCreate('PayrolManagement') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New On Call
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('teamMember') && (
          <DataGridColumnFilter
            column={table.getColumn('teamMember')}
            title="Team Member"
            options={teamMemberOptions}
          />
        )}
        {canDelete('PayrolManagement') && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={selectedCount === 0}
          >
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Delete Selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
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
          recordCount={oncalls.items.length}
          isLoading={oncalls.loading}
          emptyMessage="No on call records found. Create the first one to get started."
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <OncallFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={handleFormSuccess}
        onCreated={() => oncalls.loadItems()}
        onUpdated={(item) =>
          oncalls.setItems((prev) =>
            prev.map((i) => (i.oncallId === item.oncallId ? item : i)),
          )
        }
      />

      <OncallImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => oncalls.loadItems()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the on call record of {deletingRecord ? formatAmount(deletingRecord.oncallAmount) : ''} for{' '}
              {deletingRecord ? formatTeamMemberDisplay(deletingRecord.teamMember) : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} on call record{selectedCount === 1 ? '' : 's'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
