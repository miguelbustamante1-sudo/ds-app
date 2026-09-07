import { useEffect, useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { CalendarArrowDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { useTeamMemberSwaps } from '../hooks/useTeamMemberSwaps';
import { useReviewSwap } from '../hooks/useReviewSwap';
import { SupervisorRequestSwapDialog } from './SupervisorRequestSwapDialog';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface HolidaySwapsSectionProps {
  teamMemberId: number;
  countryId: number | null;
  approvedStatusId: number | null;
  rejectedStatusId: number | null;
}

function getStatusVariant(
  statusName: string
): 'primary' | 'secondary' | 'destructive' | 'outline' {
  const name = statusName.toLowerCase();
  if (name === 'acknowledged') return 'primary';
  if (name === 'tentative') return 'secondary';
  if (name === 'rejected' || name === 'cancelled') return 'destructive';
  return 'outline';
}

export function HolidaySwapsSection({
  teamMemberId,
  countryId,
  approvedStatusId,
  rejectedStatusId,
}: HolidaySwapsSectionProps) {
  const { toast } = useToast();
  const { swaps, loading, loadSwaps } = useTeamMemberSwaps();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [showPastSwaps, setShowPastSwaps] = useState(false);
  const [showCancelledSwaps, setShowCancelledSwaps] = useState(false);

  useEffect(() => {
    loadSwaps(teamMemberId);
  }, [teamMemberId, loadSwaps]);

  const { reviewSwap, loading: reviewing } = useReviewSwap({
    onSuccess: () => {
      toast({ title: 'Swap updated' });
      loadSwaps(teamMemberId);
    },
    onError: (msg) => toast({ title: 'Error', description: msg, variant: 'destructive' }),
  });

  const [reviewingId, setReviewingId] = useState<number | null>(null);

  async function handleApprove(swap: HolidaySwapDTO) {
    if (!approvedStatusId) return;
    setReviewingId(swap.holidaySwapId);
    await reviewSwap(swap.holidaySwapId, { statusId: approvedStatusId });
    setReviewingId(null);
  }

  async function handleReject(swap: HolidaySwapDTO) {
    if (!rejectedStatusId) return;
    setReviewingId(swap.holidaySwapId);
    await reviewSwap(swap.holidaySwapId, { statusId: rejectedStatusId });
    setReviewingId(null);
  }

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
          if (swap.statusName.toLowerCase() !== 'tentative') return null;
          const isThisOne = reviewingId === swap.holidaySwapId;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={reviewing || !approvedStatusId}
                onClick={() => handleApprove(swap)}
              >
                {isThisOne && reviewing ? 'Saving…' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={reviewing || !rejectedStatusId}
                onClick={() => handleReject(swap)}
              >
                {isThisOne && reviewing ? 'Saving…' : 'Reject'}
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [approvedStatusId, rejectedStatusId, reviewingId, reviewing, handleApprove, handleReject]
  );

  const filteredSwaps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return swaps.filter((s) => {
      const status = s.statusName.toLowerCase();
      const isCancelledOrRejected = status === 'cancelled' || status === 'rejected';
      if (isCancelledOrRejected && !showCancelledSwaps) return false;
      if (!showPastSwaps) {
        const replacement = parseUTCDateAsLocal(String(s.replacementDate));
        replacement.setHours(0, 0, 0, 0);
        if (replacement < today) return false;
      }
      return true;
    });
  }, [swaps, showPastSwaps, showCancelledSwaps]);

  const table = useReactTable({
    data: filteredSwaps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <Card className="md:col-span-2 lg:col-span-4">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarArrowDown className="h-4 w-4" />
              Holiday Swaps
            </CardTitle>
            <Button size="sm" onClick={() => setRequestDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Request Swap
            </Button>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-past-swaps"
                checked={showPastSwaps}
                onCheckedChange={(checked) => setShowPastSwaps(checked === true)}
              />
              <Label htmlFor="show-past-swaps" className="text-sm font-medium leading-none">
                Show past
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-cancelled-swaps"
                checked={showCancelledSwaps}
                onCheckedChange={(checked) => setShowCancelledSwaps(checked === true)}
              />
              <Label htmlFor="show-cancelled-swaps" className="text-sm font-medium leading-none">
                Show cancelled
              </Label>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <DataGridContainer>
              <DataGrid table={table} recordCount={filteredSwaps.length}>
                <DataGridTable />
                <DataGridPagination />
              </DataGrid>
            </DataGridContainer>
          )}
        </CardContent>
      </Card>

      <SupervisorRequestSwapDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSuccess={() => {
          toast({ title: 'Holiday swap requested' });
          loadSwaps(teamMemberId);
        }}
        teamMemberId={teamMemberId}
        countryId={countryId}
      />
    </>
  );
}
