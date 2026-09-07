import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackToHubButton } from '@/components/BackToHubButton';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Plus, Pencil, Copy, X } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { WflWorkflowTemplate } from './types';

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Inactive', value: 'INACTIVE' },
];

const ACTIVE_OPTIONS = [
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

function statusBadge(status: string) {
  if (status === 'DRAFT') return <Badge variant="primary" appearance="light">Draft</Badge>;
  if (status === 'PUBLISHED') return <Badge variant="success" appearance="light">Published</Badge>;
  if (status === 'ARCHIVED') return <Badge variant="secondary" appearance="light">Archived</Badge>;
  if (status === 'INACTIVE') return <Badge variant="warning" appearance="light">Inactive</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function TemplateListPage() {
  const navigate = useNavigate();
  const { canRead, canCreate } = usePermissions();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<WflWorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiGet<WflWorkflowTemplate[]>('/api/workflow/templates');
      setTemplates(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load templates';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handlePublish = async (wflId: string) => {
    try {
      await apiPost<unknown, Record<string, never>>(`/api/workflow/templates/${wflId}/publish`, {});
      toast({ title: 'Success', description: 'Template published.' });
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleArchive = async (wflId: string) => {
    try {
      await apiPost<unknown, Record<string, never>>(`/api/workflow/templates/${wflId}/archive`, {});
      toast({ title: 'Success', description: 'Template archived.' });
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleFork = async (wflId: string) => {
    try {
      const forked = await apiPost<WflWorkflowTemplate, Record<string, never>>(
        `/api/workflow/templates/${wflId}/fork`,
        {},
      );
      toast({ title: 'Success', description: `Created draft v${forked.versionNo}.` });
      navigate(`/admin/workflow/templates/${forked.wflId}/edit`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fork template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WflWorkflowTemplate>[]>(
    () => [
      {
        accessorKey: 'code',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
        filterFn: (row, _, value: string) =>
          row.original.code.toLowerCase().includes(value.toLowerCase()),
        size: 150,
        meta: { headerTitle: 'Code', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 220,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'versionNo',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Version" />,
        cell: ({ row }) => `v${row.original.versionNo}`,
        size: 80,
        meta: { headerTitle: 'Version', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => statusBadge(row.original.status),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.status),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-5 w-20" /> },
      },
      {
        id: 'isActive',
        accessorFn: (row) => String(row.isActive),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (row.original.isActive ? 'Yes' : 'No'),
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(String(row.original.isActive)),
        size: 80,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        accessorKey: 'effectiveFrom',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Effective From" />,
        cell: ({ row }) =>
          row.original.effectiveFrom ? formatUTCDate(String(row.original.effectiveFrom)) : '-',
        size: 140,
        meta: { headerTitle: 'Effective From', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'effectiveTo',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Effective To" />,
        cell: ({ row }) =>
          row.original.effectiveTo ? formatUTCDate(String(row.original.effectiveTo)) : '-',
        size: 140,
        meta: { headerTitle: 'Effective To', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex justify-end gap-1">
              {canCreate('WorkflowAdmin') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/workflow/templates/${t.wflId}/edit`)}
                >
                  <Pencil size={14} />
                </Button>
              )}
              {canCreate('WorkflowAdmin') && t.status === 'DRAFT' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePublish(t.wflId)}
                >
                  Publish
                </Button>
              )}
              {canCreate('WorkflowAdmin') && t.status === 'PUBLISHED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(t.wflId)}
                >
                  Archive
                </Button>
              )}
              {canCreate('WorkflowAdmin') && t.status === 'PUBLISHED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Fork into a new draft version"
                  onClick={() => handleFork(t.wflId)}
                >
                  <Copy size={14} />
                </Button>
              )}
            </div>
          );
        },
        size: 200,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-24 ml-auto" />,
        },
      },
    ],
    [canCreate, navigate],
  );

  const table = useReactTable({
    data: templates,
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

  if (!canRead('WorkflowAdmin')) {
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
          <ToolbarPageTitle>Workflow Templates</ToolbarPageTitle>
          <ToolbarDescription>Manage workflow template definitions</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('WorkflowAdmin') && (
            <Button onClick={() => navigate('/admin/workflow/templates/new')}>
              <Plus size={16} className="me-1" />
              New Template
            </Button>
          )}
          <BackToHubButton hubPath="/tasks-hub" />
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Filter by code..."
          value={(table.getColumn('code')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('code')?.setFilterValue(e.target.value)}
          className="h-8 w-48"
        />
        {table.getColumn('status') && (
          <DataGridColumnFilter
            column={table.getColumn('status')}
            title="Status"
            options={STATUS_OPTIONS}
          />
        )}
        {table.getColumn('isActive') && (
          <DataGridColumnFilter
            column={table.getColumn('isActive')}
            title="Active"
            options={ACTIVE_OPTIONS}
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
          recordCount={templates.length}
          isLoading={loading}
          emptyMessage="No workflow templates found. Create your first template to get started."
          tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
