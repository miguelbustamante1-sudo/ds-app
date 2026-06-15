import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { PhoneContractFormDialog } from './form';
import type { PhoneContractDTO, RenewPhoneContractsDTO } from '@shared/dto';
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
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';

interface RenewFormData {
  newStartDate: string;
}

export function PhoneContractsPage() {
  const [items, setItems] = useState<PhoneContractDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'status', value: ['Active'] },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [phoneFilter, setPhoneFilter] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PhoneContractDTO | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PhoneContractDTO | null>(null);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const { canRead, canCreate, canDelete } = usePermissions();
  const { toast } = useToast();

  const {
    register: registerRenew,
    handleSubmit: handleSubmitRenew,
    reset: resetRenew,
    formState: { errors: renewErrors },
  } = useForm<RenewFormData>();

  const loadItems = useCallback(() => {
    setLoading(true);
    apiGet<PhoneContractDTO[]>('/api/phone-contracts')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleEditClick = (item: PhoneContractDTO) => {
    setEditingRecord(item);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (item: PhoneContractDTO) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await apiDelete(`/api/phone-contracts/${deletingItem.phoneLineId}`);
      toast({ title: 'Success', description: `Phone contract ${deletingItem.phoneNumber} deleted.` });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      loadItems();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete phone contract',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const openRenewDialog = () => {
    resetRenew({ newStartDate: '' });
    setRenewDialogOpen(true);
  };

  const handleRenewSubmit = async (data: RenewFormData) => {
    const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.phoneLineId);
    if (selectedIds.length === 0) return;

    setRenewLoading(true);
    try {
      await apiPost<PhoneContractDTO[], RenewPhoneContractsDTO>('/api/phone-contracts/renew', {
        phoneLineIds: selectedIds,
        newStartDate: data.newStartDate,
      });
      toast({
        title: 'Success',
        description: `${selectedIds.length} phone contract(s) renewed successfully.`,
      });
      setRenewDialogOpen(false);
      setRowSelection({});
      loadItems();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to renew phone contracts',
        variant: 'destructive',
      });
    } finally {
      setRenewLoading(false);
    }
  };

  const assignedToOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((item) => {
      if (item.activeAssignment) {
        unique.set(
          item.activeAssignment.teamMemberId.toString(),
          `${item.activeAssignment.teamMemberNames} ${item.activeAssignment.teamMemberSurnames}`,
        );
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [items]);

  const columns = useMemo<ColumnDef<PhoneContractDTO>[]>(
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
        meta: { skeleton: <Skeleton className="h-4 w-4" /> },
      },
      {
        accessorKey: 'phoneNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone Number" />,
        cell: ({ row }) => <span className="font-medium">{row.original.phoneNumber}</span>,
        filterFn: (row, _id, value: string) =>
          row.original.phoneNumber.toLowerCase().includes(value.toLowerCase()),
        size: 106,
        meta: { headerTitle: 'Phone Number', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        accessorFn: (row) => (row.isActive ? 'Active' : 'Inactive'),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
        filterFn: (row, _id, values: string[]) =>
          values.includes(row.original.isActive ? 'Active' : 'Inactive'),
        size: 56,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-12" /> },
      },
      {
        id: 'assignedTo',
        accessorFn: (row) => row.activeAssignment?.teamMemberId.toString() ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assigned To" />,
        cell: ({ row }) =>
          row.original.activeAssignment
            ? `${row.original.activeAssignment.teamMemberNames} ${row.original.activeAssignment.teamMemberSurnames}`
            : <span className="text-muted-foreground">—</span>,
        filterFn: (row, _id, values: string[]) => {
          const id = row.original.activeAssignment?.teamMemberId.toString() ?? '';
          return values.includes(id);
        },
        size: 101,
        meta: { headerTitle: 'Assigned To', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'contractStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contract Start" />,
        cell: ({ row }) =>
          row.original.contractStartDate ? formatUTCDate(row.original.contractStartDate) : '—',
        size: 122,
        meta: { headerTitle: 'Contract Start', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'contractEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contract End" />,
        cell: ({ row }) =>
          row.original.contractEndDate ? formatUTCDate(row.original.contractEndDate) : '—',
        size: 122,
        meta: { headerTitle: 'Contract End', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'contractMonths',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Months" />,
        cell: ({ row }) =>
          row.original.contractMonths != null ? row.original.contractMonths : '—',
        size: 59,
        meta: { headerTitle: 'Months', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'actualCostRate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Rate" />,
        cell: ({ row }) =>
          row.original.actualCostRate != null
            ? row.original.actualCostRate.toFixed(2)
            : '—',
        size: 82,
        meta: { headerTitle: 'Cost Rate', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'billRate',
        accessorFn: (row) => row.activeAssignment?.billRate ?? null,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bill Rate" />,
        cell: ({ row }) =>
          row.original.activeAssignment != null
            ? row.original.activeAssignment.billRate.toFixed(2)
            : <span className="text-muted-foreground">—</span>,
        size: 82,
        meta: { headerTitle: 'Bill Rate', skeleton: <Skeleton className="h-4 w-14" /> },
      },
      {
        id: 'billable',
        accessorFn: (row) => row.activeAssignment?.billable ?? null,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Billable" />,
        cell: ({ row }) => {
          const assignment = row.original.activeAssignment;
          if (assignment === null) return <span className="text-muted-foreground">—</span>;
          return assignment.billable
            ? <Check size={15} className="text-green-600" />
            : <X size={15} className="text-destructive" />;
        },
        size: 72,
        meta: { headerTitle: 'Billable', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'comments',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Comments" />,
        cell: ({ row }) => row.original.comments ?? '—',
        size: 140,
        enableSorting: false,
        meta: {
          headerTitle: 'Comments',
          cellClassName: 'whitespace-normal break-words',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            {canCreate('PhoneContracts') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(row.original)}
              >
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('PhoneContracts') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(row.original)}
              >
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 52,
        enableSorting: false,
        meta: {
          headerClassName: 'text-center',
          cellClassName: 'text-center',
          skeleton: <Skeleton className="h-8 w-8 mx-auto" />,
        },
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const isFiltered = columnFilters.length > 0 || phoneFilter !== '';

  const handlePhoneFilterChange = (value: string) => {
    setPhoneFilter(value);
    table.getColumn('phoneNumber')?.setFilterValue(value);
  };

  const handleReset = () => {
    setPhoneFilter('');
    table.resetColumnFilters();
  };

  if (!canRead('PhoneContracts')) {
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
          <ToolbarPageTitle>Phone Contracts</ToolbarPageTitle>
          <ToolbarDescription>Corporate phone lines and their current assignments</ToolbarDescription>
        </ToolbarHeading>
        {canCreate('PhoneContracts') && (
          <Button size="sm" onClick={() => { setEditingRecord(null); setFormDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contract
          </Button>
        )}
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search by phone number..."
          value={phoneFilter}
          onChange={(e) => handlePhoneFilterChange(e.target.value)}
          className="h-8 w-[220px]"
        />
        {table.getColumn('assignedTo') && (
          <DataGridColumnFilter
            column={table.getColumn('assignedTo')!}
            title="Assigned To"
            options={assignedToOptions}
          />
        )}
        {table.getColumn('status') && (
          <DataGridColumnFilter
            column={table.getColumn('status')!}
            title="Status"
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
        )}
        {canCreate('PhoneContracts') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={openRenewDialog}
                  disabled={selectedCount === 0}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Renew{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Button>
              </span>
            </TooltipTrigger>
            {selectedCount === 0 && (
              <TooltipContent>Select one or more rows to enable renewal</TooltipContent>
            )}
          </Tooltip>
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={handleReset} className="h-8 px-2 lg:px-3">
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
          emptyMessage="No phone contracts found."
          tableLayout={{
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <PhoneContractFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => { setFormDialogOpen(open); if (!open) setEditingRecord(null); }}
        record={editingRecord ?? undefined}
        onSuccess={() => { setFormDialogOpen(false); setEditingRecord(null); loadItems(); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete phone contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete phone line <strong>{deletingItem?.phoneNumber}</strong> and close its
              active assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renewDialogOpen} onOpenChange={(open) => { if (!open) setRenewDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Phone Contract{selectedCount !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRenew(handleRenewSubmit)}>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Renewing <strong>{selectedCount}</strong> contract{selectedCount !== 1 ? 's' : ''}. The existing
                contract{selectedCount !== 1 ? 's' : ''} will be closed one day before the new start date and
                new contract{selectedCount !== 1 ? 's' : ''} will be created automatically.
              </p>
              <div className="space-y-2">
                <Label htmlFor="newStartDate">
                  New Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newStartDate"
                  type="date"
                  {...registerRenew('newStartDate', { required: 'New start date is required' })}
                />
                {renewErrors.newStartDate && (
                  <p className="text-sm text-destructive">{renewErrors.newStartDate.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenewDialogOpen(false)} disabled={renewLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={renewLoading}>
                {renewLoading ? 'Renewing...' : 'Renew'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
