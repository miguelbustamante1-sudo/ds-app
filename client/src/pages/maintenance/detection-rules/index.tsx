import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DETECTION_RULE_TYPES } from '@shared/dto';
import type { DetectionRuleDto, SetDetectionRuleActiveDto, SetDetectionRuleActiveResultDto } from '@shared/dto';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { BackToHubButton } from '@/components/BackToHubButton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPatch } from '@/lib/api';
import { RULE_TYPE_LABELS, describeRule } from '@/lib/detection-rules';
import { formatUTCDate } from '@/lib/utils';
import { DetectionRuleFormDialog } from './form';

type RuleStatus = 'Active' | 'Inactive';

const STATUS_OPTIONS: Array<{ label: string; value: RuleStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

const RULE_TYPE_OPTIONS = DETECTION_RULE_TYPES.map((type) => ({ label: RULE_TYPE_LABELS[type], value: type }));

const SEVERITY_VARIANT: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

const ruleStatus = (rule: DetectionRuleDto): RuleStatus => (rule.active ? 'Active' : 'Inactive');

export function DetectionRulesPage() {
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const [rules, setRules] = useState<DetectionRuleDto[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DetectionRuleDto | undefined>();
  const [retiringRule, setRetiringRule] = useState<DetectionRuleDto | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const showError = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof Error ? err.message : fallback;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
    [toast],
  );

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await apiGet<DetectionRuleDto[]>('/api/detection-rules'));
    } catch (err) {
      showError(err, 'Failed to load detection rules');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadRules();
    apiGet<string[]>('/api/detection-rules/entity-types')
      .then(setEntityTypes)
      .catch((err) => showError(err, 'Failed to load entity types'));
  }, [loadRules, showError]);

  const setActive = useCallback(
    async (rule: DetectionRuleDto, active: boolean) => {
      try {
        const result = await apiPatch<SetDetectionRuleActiveResultDto, SetDetectionRuleActiveDto>(
          `/api/detection-rules/${rule.ruleId}/active`,
          { active },
        );
        const retired = result.findingsRetired > 0 ? `, ${result.findingsRetired} open findings closed` : '';
        toast({
          title: 'Success',
          description: `Rule #${rule.ruleId} ${active ? 'turned on' : 'turned off'}${retired}`,
        });
        loadRules();
      } catch (err) {
        showError(err, 'Failed to update rule');
      }
    },
    [toast, loadRules, showError],
  );

  // Turning off closes open findings, so ask first when there are any.
  const handleToggle = useCallback(
    (rule: DetectionRuleDto, active: boolean) => {
      if (!active && rule.openFindingCount > 0) {
        setRetiringRule(rule);
        return;
      }
      setActive(rule, active);
    },
    [setActive],
  );

  const handleEdit = useCallback((rule?: DetectionRuleDto) => {
    setEditingRule(rule);
    setFormOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<DetectionRuleDto>[]>(
    () => [
      {
        accessorKey: 'ruleId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">#{row.original.ruleId}</span>,
        size: 70,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'entityType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Entity" />,
        size: 110,
        meta: { headerTitle: 'Entity', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'field',
        accessorFn: (row) => row.definition.field,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Field" />,
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
        filterFn: (row, _id, value: string) =>
          row.original.definition.field.toLowerCase().includes(value.toLowerCase()),
        size: 200,
        meta: { headerTitle: 'Field', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'ruleType',
        accessorFn: (row) => row.ruleType,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rule" />,
        cell: ({ row }) => (
          <div>
            <div>{describeRule(row.original.ruleType, row.original.definition)}</div>
            <div className="text-xs text-muted-foreground">{row.original.ruleType}</div>
          </div>
        ),
        filterFn: (row, _id, value: string[]) => !value.length || value.includes(row.original.ruleType),
        size: 240,
        meta: { headerTitle: 'Rule', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => (
          <Badge variant={SEVERITY_VARIANT[row.original.severity] ?? 'secondary'} appearance="light">
            {row.original.severity}
          </Badge>
        ),
        size: 100,
        meta: { headerTitle: 'Severity', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'version',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Version" />,
        cell: ({ row }) => `v${row.original.version}`,
        size: 90,
        meta: { headerTitle: 'Version', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'openFindingCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Open Findings" />,
        size: 120,
        meta: { headerTitle: 'Open Findings', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {formatUTCDate(row.original.createdAt)}
            <span className="block">{row.original.createdBy ?? '—'}</span>
          </div>
        ),
        size: 150,
        meta: { headerTitle: 'Created', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'status',
        accessorFn: (row) => ruleStatus(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (
          <Switch
            checked={row.original.active}
            disabled={!canCreate('Findings')}
            onCheckedChange={(checked) => handleToggle(row.original, checked)}
          />
        ),
        filterFn: (row, _id, value: string[]) => !value.length || value.includes(ruleStatus(row.original)),
        size: 90,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-5 w-9" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canCreate('Findings') && (
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
              <Pencil size={16} />
            </Button>
          ),
        size: 70,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-8 ml-auto" /> },
      },
    ],
    [canCreate, handleToggle, handleEdit],
  );

  const table = useReactTable({
    data: rules,
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

  if (!canRead('Findings')) {
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
          <ToolbarPageTitle>Detection Rules</ToolbarPageTitle>
          <ToolbarDescription>
            State rules evaluated by "Run Rules" on the Findings screen. Rules cannot be deleted — turn
            them off instead.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/maintenance-hub" />
          {canCreate('Findings') && (
            <Button onClick={() => handleEdit(undefined)}>
              <Plus size={16} className="me-1" />
              New Rule
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search field..."
          value={(table.getColumn('field')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('field')?.setFilterValue(e.target.value || undefined)}
          className="h-8 w-[180px]"
        />
        {table.getColumn('status') && (
          <DataGridColumnFilter column={table.getColumn('status')} title="Status" options={STATUS_OPTIONS} />
        )}
        {table.getColumn('ruleType') && (
          <DataGridColumnFilter column={table.getColumn('ruleType')} title="Rule" options={RULE_TYPE_OPTIONS} />
        )}
        {columnFilters.length > 0 && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading rules...</div>
      ) : (
        <DataGridContainer className="mt-4">
          <DataGrid
            table={table}
            recordCount={rules.length}
            emptyMessage="No detection rules yet. Create one to get started."
            tableLayout={{ columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
          >
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}

      <DetectionRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRule}
        entityTypes={entityTypes}
        onSuccess={() => {
          setFormOpen(false);
          setEditingRule(undefined);
          loadRules();
        }}
      />

      <AlertDialog open={!!retiringRule} onOpenChange={(open) => !open && setRetiringRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off rule #{retiringRule?.ruleId}?</AlertDialogTitle>
            <AlertDialogDescription>
              This rule has {retiringRule?.openFindingCount} open findings. Turning it off closes them with
              status "Rule Retired". Turning it back on later re-checks from scratch on the next "Run Rules".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (retiringRule) setActive(retiringRule, false);
                setRetiringRule(null);
              }}
            >
              Turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
