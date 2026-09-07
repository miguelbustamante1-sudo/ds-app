import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, Upload, X } from 'lucide-react';
import type { OtherIncomeDTO, BulkDeleteOtherIncomeDTO } from '@shared/dto';
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
import { Badge } from '@/components/ui/badge';
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
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { BackToHubButton } from '@/components/BackToHubButton';
import { OtherIncomeFormDialog } from '../other-incomes/form';
import { OtherIncomeImportDialog } from './import-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IncomeTypesTab } from './income-types-tab';
import { AuthorizerAssignmentsTab } from './authorizer-assignments-tab';

function formatTeamMemberDisplay(tm: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string }) {
  const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
  return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
}

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'destructive';
  return 'secondary';
}

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];

export function OtherIncomesAdminPage() {
  const [items, setItems] = useState<OtherIncomeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeDTO | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<OtherIncomeDTO | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { toast } = useToast();
  const { canRead, canCreate, canDelete } = usePermissions();

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet<OtherIncomeDTO[]>('/api/other-incomes?scope=all');
      setItems(data);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCreate = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const handleEdit = (record: OtherIncomeDTO) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDeleteClick = (record: OtherIncomeDTO) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await apiDelete(`/api/other-incomes/${deletingRecord.oinId}`);
      setItems((prev) => prev.filter((i) => i.oinId !== deletingRecord.oinId));
      toast({ title: 'Success', description: 'Entry deleted' });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete entry',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.oinId);
    if (selectedIds.length === 0) {
      setBulkDeleteDialogOpen(false);
      return;
    }
    try {
      await apiPost<void, BulkDeleteOtherIncomeDTO>('/api/other-incomes/bulk-delete', { oinIds: selectedIds });
      toast({ title: 'Success', description: `${selectedIds.length} entr${selectedIds.length === 1 ? 'y' : 'ies'} deleted.` });
      setRowSelection({});
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.oinId)));
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to bulk delete entries',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
  };

  const columns = useMemo<ColumnDef<OtherIncomeDTO>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false
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
        size: 220,
      },
      {
        id: 'incomeType',
        accessorFn: (row) => row.incomeType.incomeTypeName,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Income Type" />,
        size: 150,
      },
      {
        accessorKey: 'oinAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => Number(row.original.oinAmount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        size: 120,
      },
      {
        id: 'quantity',
        accessorFn: (row) => `${row.oinCuantity} ${row.oinMeasurment}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Quantity" />,
        size: 140,
      },
      {
        id: 'payrol',
        accessorFn: (row) => `${row.payrol.prlDescription} (${row.payrol.prlMonth}/${row.payrol.prlYear})`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Payrol Period" />,
        size: 180,
      },
      {
        id: 'authorizer',
        accessorFn: (row) => formatTeamMemberDisplay(row.authorizer),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Authorizer" />,
        size: 200,
      },
      {
        accessorKey: 'oinStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        filterFn: (row, _id, value: string[]) => (value.length === 0 ? true : value.includes(row.original.oinStatus)),
        cell: ({ row }) => <Badge variant={statusVariant(row.original.oinStatus)}>{row.original.oinStatus}</Badge>,
        size: 110,
      },
      {
        accessorKey: 'oinRejectionReason',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rejection Reason" />,
        cell: ({ row }) => row.original.oinRejectionReason ?? '—',
        size: 220,
      },
      {
        accessorKey: 'oinCreatedDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => formatUTCDate(row.original.oinCreatedDate),
        size: 130,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canCreate('PayrollAdmin') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('PayrollAdmin') && (
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
    data: items,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.oinId.toString(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const isFiltered = columnFilters.length > 0;
  const selectedCount = table.getSelectedRowModel().rows.length;

  if (!canRead('PayrollAdmin')) {
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
          <ToolbarPageTitle>Other Incomes — Admin</ToolbarPageTitle>
          <ToolbarDescription>Organization-wide view of all other income entries</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/payrol-hub" />
        </ToolbarActions>
      </Toolbar>

      <Tabs defaultValue="entries" className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="income-types">Income Types</TabsTrigger>
          <TabsTrigger value="authorizer-assignments">Authorizer Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            {canCreate('PayrollAdmin') && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload size={16} className="me-1" />
                Import
              </Button>
            )}
            {canCreate('PayrollAdmin') && (
              <Button onClick={handleCreate}>
                <Plus size={16} className="me-1" />
                New Entry
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {table.getColumn('oinStatus') && (
              <DataGridColumnFilter column={table.getColumn('oinStatus')} title="Status" options={STATUS_OPTIONS} />
            )}
            {canDelete('PayrollAdmin') && (
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
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <DataGridContainer>
            <DataGrid table={table} recordCount={items.length} isLoading={loading} emptyMessage="No other income entries found.">
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>

        <TabsContent value="income-types" className="mt-4">
          <IncomeTypesTab />
        </TabsContent>

        <TabsContent value="authorizer-assignments" className="mt-4">
          <AuthorizerAssignmentsTab />
        </TabsContent>
      </Tabs>

      <OtherIncomeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        isAdmin
        onSuccess={handleFormSuccess}
        onCreated={() => loadItems()}
        onUpdated={(item) => setItems((prev) => prev.map((i) => (i.oinId === item.oinId ? item : i)))}
      />

      <OtherIncomeImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => loadItems()} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this other income entry. This action cannot be undone.
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
              This will permanently delete {selectedCount} entr{selectedCount === 1 ? 'y' : 'ies'}. This action cannot
              be undone.
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
