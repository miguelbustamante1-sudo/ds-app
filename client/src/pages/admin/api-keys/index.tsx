import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { X } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { ApiKeyDTO } from '@shared/dto';
import { fetchApiKeys, revokeApiKey, deleteApiKey } from './api';
import { IssueKeyDialog } from './IssueKeyDialog';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Revoked', value: 'revoked' },
];

function statusBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="success" appearance="light">Active</Badge>
    : <Badge variant="destructive" appearance="light">Revoked</Badge>;
}

export function ApiKeysAdminPage() {
  const { canRead, canCreate, canDelete } = usePermissions();
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKeyDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [issueOpen, setIssueOpen] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load API keys';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleRevoke = useCallback(async (apkId: number, apkName: string) => {
    try {
      await revokeApiKey(apkId);
      toast({ title: 'Key revoked', description: apkName });
      void loadKeys();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke key';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }, [loadKeys, toast]);

  const handleDelete = useCallback(async (apkId: number, apkName: string) => {
    try {
      await deleteApiKey(apkId);
      toast({ title: 'Key deleted', description: apkName });
      void loadKeys();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete key';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }, [loadKeys, toast]);

  const columns = useMemo<ColumnDef<ApiKeyDTO>[]>(
    () => [
      {
        accessorKey: 'apkName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 220,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'status',
        accessorFn: (row) => row.apkIsActive ? 'active' : 'revoked',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => statusBadge(row.original.apkIsActive),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.apkIsActive ? 'active' : 'revoked'),
        size: 110,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        accessorKey: 'createdByUserName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created By" />,
        size: 160,
        meta: { headerTitle: 'Created By', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'apkCreatedDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created Date" />,
        cell: ({ row }) => formatUTCDate(row.original.apkCreatedDate),
        size: 130,
        meta: { headerTitle: 'Created Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'apkLastUsedDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Last Used" />,
        cell: ({ row }) =>
          row.original.apkLastUsedDate
            ? formatUTCDate(row.original.apkLastUsedDate)
            : <span className="text-muted-foreground">Never</span>,
        size: 130,
        meta: { headerTitle: 'Last Used', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const key = row.original;
          return (
            <div className="flex justify-end gap-2">
              {key.apkIsActive && canCreate('StandaloneTaskAdmin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRevoke(key.apkId, key.apkName)}
                >
                  Revoke
                </Button>
              )}
              {key.apkLastUsedDate === null && canDelete('StandaloneTaskAdmin') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleDelete(key.apkId, key.apkName)}
                >
                  Delete
                </Button>
              )}
            </div>
          );
        },
        size: 160,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-32 ml-auto" />,
        },
      },
    ],
    [canCreate, canDelete, handleRevoke, handleDelete],
  );

  const table = useReactTable({
    data: keys,
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

  if (!canRead('StandaloneTaskAdmin')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  const isFiltered = columnFilters.length > 0;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>API Keys</ToolbarPageTitle>
          <ToolbarDescription>Manage API keys for external system integrations</ToolbarDescription>
        </ToolbarHeading>
        {canCreate('StandaloneTaskAdmin') && (
          <ToolbarActions>
            <Button onClick={() => setIssueOpen(true)}>+ Issue API Key</Button>
          </ToolbarActions>
        )}
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        {table.getColumn('status') && (
          <DataGridColumnFilter
            column={table.getColumn('status')}
            title="Status"
            options={STATUS_OPTIONS}
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
          recordCount={keys.length}
          isLoading={loading}
          emptyMessage="No API keys found."
          tableLayout={{ columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <IssueKeyDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onSuccess={() => {
          setIssueOpen(false);
          void loadKeys();
        }}
      />
    </div>
  );
}
