import { useNavigate } from 'react-router';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkdayReconciliationReport } from './useWorkdayReconciliationReport';
import { useWorkdayReconciliationColumns } from './columns';

export function WorkdayReconciliationPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useWorkdayReconciliationReport();
  const columns = useWorkdayReconciliationColumns();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" />
              Reports
            </Button>
            <span className="text-muted-foreground">/</span>
            <ToolbarPageTitle>Workday Reconciliation</ToolbarPageTitle>
          </div>
        </ToolbarHeading>
        <ToolbarActions />
      </Toolbar>

      <div className="mt-4 mb-6">
        <p className="text-sm text-muted-foreground">
          Vacation days recorded in the application that are not yet reflected in Workday,
          starting in the next 45 days.
        </p>
      </div>

      <div className="space-y-4">
        {isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            Failed to load data. Please try again.
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            <p className="text-sm text-muted-foreground">
              {data.length.toLocaleString()} record{data.length !== 1 ? 's' : ''} found
            </p>
            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={data.length}
                tableLayout={{
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
              >
                <div className="overflow-x-auto">
                  <DataGridTable />
                </div>
              </DataGrid>
            </DataGridContainer>
          </>
        )}
      </div>
    </div>
  );
}
