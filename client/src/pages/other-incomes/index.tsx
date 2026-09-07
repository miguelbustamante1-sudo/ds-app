import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, Check, X as XIcon } from 'lucide-react';
import type { OtherIncomeDTO, CreateOtherIncomeDTO, UpdateOtherIncomeDTO } from '@shared/dto';
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
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { formatUTCDate } from '@/lib/utils';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { BackToHubButton } from '@/components/BackToHubButton';
import { OtherIncomeFormDialog } from './form';

function formatTeamMemberDisplay(tm: { workdayId: string | null; teamMemberNames: string; teamMemberSurnames: string }) {
  const name = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`;
  return tm.workdayId ? `${tm.workdayId} - ${name}` : name;
}

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'destructive';
  return 'secondary';
}

export function OtherIncomesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<OtherIncomeDTO | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRecord, setRejectingRecord] = useState<OtherIncomeDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const otherIncomes = useEntityList<OtherIncomeDTO, CreateOtherIncomeDTO, UpdateOtherIncomeDTO>({
    // No query string here: useEntityList's updateItem/deleteItem naively build
    // `${endpoint}/${id}`, so a query string would produce a malformed URL like
    // "/api/other-incomes?scope=team/123". The backend route already defaults to
    // scope=team for any value other than "all" (including no query param at all),
    // so omitting it here is both correct and necessary.
    endpoint: '/api/other-incomes',
    idKey: 'oinId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError: (error) => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    otherIncomes.loadItems();
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
      await otherIncomes.deleteItem(deletingRecord.oinId);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleApprove = async (record: OtherIncomeDTO) => {
    try {
      const updated = await apiPost<OtherIncomeDTO, Record<string, never>>(
        `/api/other-incomes/${record.oinId}/approve`,
        {},
      );
      otherIncomes.setItems((prev) => prev.map((i) => (i.oinId === updated.oinId ? updated : i)));
      toast({ title: 'Success', description: 'Entry approved' });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve entry',
        variant: 'destructive',
      });
    }
  };

  const handleRejectClick = (record: OtherIncomeDTO) => {
    setRejectingRecord(record);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingRecord) return;
    try {
      const updated = await apiPost<OtherIncomeDTO, { reason: string }>(
        `/api/other-incomes/${rejectingRecord.oinId}/reject`,
        { reason: rejectReason },
      );
      otherIncomes.setItems((prev) => prev.map((i) => (i.oinId === updated.oinId ? updated : i)));
      toast({ title: 'Success', description: 'Entry rejected' });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject entry',
        variant: 'destructive',
      });
    } finally {
      setRejectDialogOpen(false);
      setRejectingRecord(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
  };

  const columns = useMemo<ColumnDef<OtherIncomeDTO>[]>(
    () => [
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
        cell: ({ row }) => <Badge variant={statusVariant(row.original.oinStatus)}>{row.original.oinStatus}</Badge>,
        size: 110,
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
        cell: ({ row }) => {
          const r = row.original;
          const editable = canCreate('OtherIncomes') && (r.oinStatus === 'Pending' || r.oinStatus === 'Rejected');
          const decidable = canCreate('OtherIncomes') && r.oinStatus === 'Pending';
          return (
            <div className="flex justify-end gap-1">
              {decidable && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleApprove(r)} title="Approve">
                    <Check size={16} className="text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRejectClick(r)} title="Reject">
                    <XIcon size={16} className="text-destructive" />
                  </Button>
                </>
              )}
              {editable && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(r)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </>
              )}
            </div>
          );
        },
        size: 160,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [canCreate],
  );

  const table = useReactTable({
    data: otherIncomes.items,
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

  if (!canRead('OtherIncomes')) {
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
          <ToolbarPageTitle>Other Incomes</ToolbarPageTitle>
          <ToolbarDescription>
            Entries for your team, plus anything you're the assigned authorizer for
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/payrol-hub" />
          {canCreate('OtherIncomes') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Entry
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={otherIncomes.items.length}
          isLoading={otherIncomes.loading}
          emptyMessage="No other income entries found."
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <OtherIncomeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={handleFormSuccess}
        onCreated={() => otherIncomes.loadItems()}
        onUpdated={(item) => otherIncomes.setItems((prev) => prev.map((i) => (i.oinId === item.oinId ? item : i)))}
      />

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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Entry</DialogTitle>
            <DialogDescription>A reason is required to reject this entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this entry being rejected?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={rejectReason.trim().length === 0}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
