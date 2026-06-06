import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type {
  TeamMemberBonusDTO,
  CreateTeamMemberBonusDTO,
  UpdateTeamMemberBonusDTO,
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
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useEntityList } from '@/hooks/use-entity-list';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMemberBonusFormDialog } from './form';

// Static filter options for the known periodicity enum
const PERIODICITY_FILTER_OPTIONS = [
  { label: 'Monthly',   value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Annual',    value: 'ANNUAL' },
  { label: 'One-time',  value: 'ONE_TIME' },
];

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return '-';
  return formatUTCDate(String(date));
};

export function TeamMemberBonusesPage() {
  const [formOpen, setFormOpen]             = useState(false);
  const [editingRecord, setEditingRecord]   = useState<TeamMemberBonusDTO | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<TeamMemberBonusDTO | null>(null);
  const [sorting, setSorting]               = useState<SortingState>([]);
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>([]);
  const { toast }                           = useToast();
  const { canRead, canCreate, canDelete }   = usePermissions();

  const bonuses = useEntityList<TeamMemberBonusDTO, CreateTeamMemberBonusDTO, UpdateTeamMemberBonusDTO>({
    endpoint: '/api/team-member-bonuses',
    idKey: 'teamMemberBonusId',
    onSuccess: (message) => toast({ title: 'Success', description: message }),
    onError:   (error)   => toast({ title: 'Error', description: error, variant: 'destructive' }),
  });

  useEffect(() => {
    bonuses.loadItems();
  }, []);

  const handleCreate = () => { setEditingRecord(undefined); setFormOpen(true); };
  const handleEdit   = (r: TeamMemberBonusDTO) => { setEditingRecord(r); setFormOpen(true); };

  const handleDeleteClick = (r: TeamMemberBonusDTO) => {
    setDeletingRecord(r);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await bonuses.deleteItem(deletingRecord.teamMemberBonusId);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(undefined);
  };

  // Dynamic filter options derived from loaded data
  const teamMemberOptions = useMemo(() => {
    const unique = new Map<string, string>();
    bonuses.items.forEach((item) => {
      if (item.teamMember) {
        unique.set(
          item.teamMember.teamMemberId.toString(),
          `${item.teamMember.teamMemberNames} ${item.teamMember.teamMemberSurnames}`,
        );
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [bonuses.items]);

  const categoryOptions = useMemo(() => {
    const unique = new Map<string, string>();
    bonuses.items.forEach((item) => {
      if (item.bonusCategory) {
        unique.set(
          item.bonusCategory.bonusCategoryId.toString(),
          item.bonusCategory.bonusCategoryName,
        );
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label }));
  }, [bonuses.items]);

  const columns = useMemo<ColumnDef<TeamMemberBonusDTO>[]>(
    () => [
      {
        accessorKey: 'teamMemberBonusId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.teamMemberBonusId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        id: 'teamMember',
        accessorFn: (row) =>
          row.teamMember
            ? `${row.teamMember.teamMemberNames} ${row.teamMember.teamMemberSurnames}`
            : '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) =>
          row.original.teamMember
            ? `${row.original.teamMember.teamMemberNames} ${row.original.teamMember.teamMemberSurnames}`
            : '-',
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.teamMember?.teamMemberId.toString() ?? '');
        },
        size: 220,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'bonusCategory',
        accessorFn: (row) => row.bonusCategory?.bonusCategoryName ?? '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => row.original.bonusCategory?.bonusCategoryName ?? '-',
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.bonusCategory?.bonusCategoryId.toString() ?? '');
        },
        size: 160,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'bonusAmount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
        cell: ({ row }) => row.original.bonusAmount,
        size: 110,
        meta: { headerTitle: 'Amount', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'bonusPeriodicity',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Periodicity" />,
        cell: ({ row }) => row.original.bonusPeriodicity,
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.bonusPeriodicity);
        },
        size: 120,
        meta: { headerTitle: 'Periodicity', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'bonusStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.bonusStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'bonusEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.bonusEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('TeamMemberBonuses') && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete('TeamMemberBonuses') && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-20 ml-auto" />,
        },
      },
    ],
    [canCreate, canDelete],
  );

  const table = useReactTable({
    data: bonuses.items,
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

  if (!canRead('TeamMemberBonuses')) {
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
          <ToolbarPageTitle>Team Member Bonuses</ToolbarPageTitle>
          <ToolbarDescription>Manage recurring bonus assignments per team member</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('TeamMemberBonuses') && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="me-1" />
              New Bonus
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
        {table.getColumn('bonusCategory') && (
          <DataGridColumnFilter
            column={table.getColumn('bonusCategory')}
            title="Category"
            options={categoryOptions}
          />
        )}
        {table.getColumn('bonusPeriodicity') && (
          <DataGridColumnFilter
            column={table.getColumn('bonusPeriodicity')}
            title="Periodicity"
            options={PERIODICITY_FILTER_OPTIONS}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={bonuses.items.length}
          isLoading={bonuses.loading}
          emptyMessage="No bonuses found. Create the first bonus assignment to get started."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <TeamMemberBonusFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={handleFormSuccess}
        onCreated={(item) => bonuses.setItems((prev) => [...prev, item])}
        onUpdated={(item) =>
          bonuses.setItems((prev) =>
            prev.map((i) => (i.teamMemberBonusId === item.teamMemberBonusId ? item : i)),
          )
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRecord && (
                <>
                  This will permanently delete the{' '}
                  <strong>{deletingRecord.bonusCategory?.bonusCategoryName ?? 'bonus'}</strong> for{' '}
                  <strong>
                    {deletingRecord.teamMember
                      ? `${deletingRecord.teamMember.teamMemberNames} ${deletingRecord.teamMember.teamMemberSurnames}`
                      : 'this team member'}
                  </strong>
                  . This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
