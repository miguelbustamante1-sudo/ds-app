import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { BackToHubButton } from '@/components/BackToHubButton';
import { formatUTCDate } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import type { PerformanceCaseDTO } from '@shared/dto';

interface ReportFilters {
  dateField: 'createdDate' | 'closureSignoffDate';
  dateFrom: string;
  dateTo: string;
  severityTier: string;
}

export function PerformanceCasesReportPage() {
  const [rows, setRows] = useState<PerformanceCaseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<ReportFilters>({
    defaultValues: { dateField: 'createdDate', dateFrom: '', dateTo: '', severityTier: '' },
  });

  async function onSubmit(values: ReportFilters) {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(values).filter(([, v]) => v));
      const result = await apiGet<PerformanceCaseDTO[]>(`/api/reports/performance-cases?${params.toString()}`);
      setRows(result);
    } finally {
      setLoading(false);
    }
  }

  const columns: ColumnDef<PerformanceCaseDTO>[] = [
    { accessorKey: 'caseCode', header: 'Case' },
    { accessorKey: 'severityTier', header: 'Tier' },
    { accessorKey: 'currentPhase', header: 'Phase' },
    { accessorKey: 'caseStatus', header: 'Status' },
    {
      accessorKey: 'createdDate',
      header: 'Created',
      cell: ({ row }) => formatUTCDate(row.original.createdDate),
    },
    {
      accessorKey: 'closureSignoffDate',
      header: 'Closed',
      cell: ({ row }) => (row.original.closureSignoffDate ? formatUTCDate(row.original.closureSignoffDate) : '—'),
    },
  ];
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Performance Cases Report</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/reports-hub" />
        </ToolbarActions>
      </Toolbar>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <Label>Date Field</Label>
          <Controller
            name="dateField"
            control={control}
            render={({ field }) => (
              <ComboBox
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: 'createdDate', label: 'Created' },
                  { value: 'closureSignoffDate', label: 'Closed' },
                ]}
              />
            )}
          />
        </div>
        <div>
          <Label>From</Label>
          <Controller name="dateFrom" control={control} render={({ field }) => <Input type="date" {...field} />} />
        </div>
        <div>
          <Label>To</Label>
          <Controller name="dateTo" control={control} render={({ field }) => <Input type="date" {...field} />} />
        </div>
        <div>
          <Label>Severity Tier</Label>
          <Controller
            name="severityTier"
            control={control}
            render={({ field }) => (
              <ComboBox
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: '', label: 'All' },
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
            )}
          />
        </div>
        <Button type="submit">Run Report</Button>
      </form>
      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer>
          <DataGrid table={table} recordCount={rows.length}>
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
