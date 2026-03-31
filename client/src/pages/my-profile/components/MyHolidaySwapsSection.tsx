import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { CalendarArrowDown, Plus, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatUTCDate } from '@/lib/utils';
import { useMySwaps } from '@/pages/holiday-swaps/hooks/useMySwaps';
import { RequestSwapDialog } from '@/pages/holiday-swaps/components/RequestSwapDialog';
import { CancelSwapDialog } from '@/pages/holiday-swaps/components/CancelSwapDialog';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

function getStatusVariant(
  statusName: string
): 'primary' | 'secondary' | 'destructive' | 'outline' {
  const name = statusName.toLowerCase();
  if (name === 'acknowledged') return 'primary';
  if (name === 'tentative') return 'secondary';
  if (name === 'rejected' || name === 'cancelled') return 'destructive';
  return 'outline';
}

export function MyHolidaySwapsSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { swaps, loading, loadSwaps } = useMySwaps();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<HolidaySwapDTO | null>(null);

  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const columns = useMemo<ColumnDef<HolidaySwapDTO>[]>(
    () => [
      {
        accessorKey: 'holidayName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday" />,
        cell: ({ row }) => <span className="font-medium">{row.original.holidayName}</span>,
      },
      {
        accessorKey: 'originalDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday Date" />,
        cell: ({ row }) => formatUTCDate(row.original.originalDate),
      },
      {
        accessorKey: 'replacementDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Replacement Date" />,
        cell: ({ row }) => (
          <span
            className={
              row.original.statusName.toLowerCase() === 'acknowledged'
                ? 'text-green-600 font-medium'
                : undefined
            }
          >
            {formatUTCDate(row.original.replacementDate)}
          </span>
        ),
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested" />,
        cell: ({ row }) =>
          row.original.createdAt ? formatUTCDate(row.original.createdAt) : '—',
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const swap = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/holiday-swaps/${swap.holidaySwapId}`);
                }}
              >
                View
              </Button>
              {swap.statusName.toLowerCase() === 'tentative' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelTarget(swap);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: swaps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarArrowDown className="h-4 w-4" />
            Holiday Swaps
          </CardTitle>
          <Button size="sm" onClick={() => setRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Request Swap
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={swaps.length}>
                <DataGridTable />
                <DataGridPagination />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <RequestSwapDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSuccess={(swap) => {
          toast({ title: 'Holiday swap requested', description: `Your swap request for ${swap.holidayName} has been submitted.` });
          loadSwaps();
        }}
      />

      <CancelSwapDialog
        swap={cancelTarget}
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onSuccess={(swap) => {
          toast({ title: 'Swap cancelled', description: `Your holiday swap for ${swap.holidayName} has been cancelled.` });
          setCancelTarget(null);
          loadSwaps();
        }}
      />
    </>
  );
}
