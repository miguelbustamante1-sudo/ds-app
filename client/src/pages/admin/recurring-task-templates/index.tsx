import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { CardContent, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatUTCDate } from '@/lib/utils';
import { BackToHubButton } from '@/components/BackToHubButton';
import {
  getRecurringTaskTemplates,
  updateRecurringTaskTemplate,
} from '@/api/recurringTaskTemplates';
import { CreateTemplateDrawer } from './CreateTemplateDrawer';
import type { RecurringTaskTemplateDTO } from '@shared/dto';

function priorityBadge(priority: string) {
  if (priority === 'LOW') return <Badge variant="primary" appearance="light">Low</Badge>;
  if (priority === 'MEDIUM') return <Badge variant="warning" appearance="light">Medium</Badge>;
  if (priority === 'HIGH') return <Badge variant="destructive" appearance="light">High</Badge>;
  if (priority === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

export function RecurringTaskTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RecurringTaskTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecurringTaskTemplates(includeInactive);
      setTemplates(data);
    } catch {
      toast({ title: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [includeInactive, toast]);

  useEffect(() => { void load(); }, [load]);

  const handleDeactivate = useCallback(async (templateId: number) => {
    try {
      await updateRecurringTaskTemplate(templateId, { isActive: false });
      toast({ title: 'Template deactivated' });
      void load();
    } catch {
      toast({ title: 'Failed to deactivate template', variant: 'destructive' });
    }
  }, [load, toast]);

  const columns = useMemo<ColumnDef<RecurringTaskTemplateDTO>[]>(() => [
    {
      accessorKey: 'templateTitle',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
    },
    {
      accessorKey: 'templatePriority',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => priorityBadge(row.original.templatePriority),
    },
    {
      accessorKey: 'intervalDays',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Interval (days)" />,
    },
    {
      id: 'assigneeMode',
      header: 'Assignee Mode',
      cell: ({ row }) =>
        row.original.useSupervisorHierarchy
          ? <Badge variant="secondary" appearance="light">Hierarchy</Badge>
          : <Badge variant="outline">Fixed</Badge>,
    },
    {
      id: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => {
        const t = row.original;
        if (t.useSupervisorHierarchy) return <span className="text-muted-foreground">—</span>;
        return t.teamMemberNames
          ? `${t.teamMemberNames} ${t.teamMemberSurnames}`
          : '—';
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) =>
        row.original.isActive
          ? <Badge variant="success" appearance="light">Active</Badge>
          : <Badge variant="outline">Inactive</Badge>,
    },
    {
      accessorKey: 'createdDate',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
      cell: ({ row }) => formatUTCDate(row.original.createdDate),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDeactivate(row.original.templateId)}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ], [handleDeactivate]);

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Recurring Task Templates</ToolbarPageTitle>
          <ToolbarDescription>Manage templates that auto-generate recurring tasks</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-inactive"
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(checked === true)}
            />
            <Label htmlFor="include-inactive" className="cursor-pointer text-sm">Show inactive</Label>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>Create Template</Button>
          <BackToHubButton hubPath="/tasks-hub" />
        </ToolbarActions>
      </Toolbar>

      <div className="p-6">
        <CardContent>
          <CardTitle className="mb-4">Templates</CardTitle>
          <DataGridContainer>
            <DataGrid
              table={table}
              recordCount={templates.length}
              isLoading={loading}
              emptyMessage="No templates found."
            >
              <DataGridTable />
              <DataGridPagination />
            </DataGrid>
          </DataGridContainer>
        </CardContent>
      </div>

      <CreateTemplateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={() => { void load(); }}
      />
    </>
  );
}
