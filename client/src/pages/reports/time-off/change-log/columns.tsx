import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle } from 'lucide-react';
import type { TimeOffChangeLogRowDTO } from '@shared/dto/TimeOffChangeLog';

const EM_DASH = '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderDate(val: string | null): string {
  if (!val) return EM_DASH;
  const [y, m, d] = val.split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}

function renderNum(val: number | null): string {
  return val != null ? String(val) : EM_DASH;
}

function renderStr(val: string | null | undefined): string {
  return val ?? EM_DASH;
}

function statusVariant(name: string | null | undefined): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (!name) return 'outline';
  const l = name.toLowerCase();
  if (l.includes('approved')) return 'success';
  if (l.includes('pending') || l.includes('tentative')) return 'secondary';
  if (l.includes('cancel') || l.includes('reject')) return 'destructive';
  return 'outline';
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

interface DiffEntry {
  label: string;
  oldVal: string;
  newVal: string;
  isStatus?: boolean;
}

function buildDiff(row: TimeOffChangeLogRowDTO): DiffEntry[] | 'created' {
  if (
    row.origStartDate === null &&
    row.origEndDate === null &&
    row.origDays === null &&
    row.origCategory === null &&
    row.origStatus === null &&
    row.origActive === null
  ) {
    return 'created';
  }

  const pairs: Array<{ label: string; orig: string; newV: string; isStatus?: boolean }> = [
    { label: 'Start',    orig: renderDate(row.origStartDate), newV: renderDate(row.newStartDate) },
    { label: 'End',      orig: renderDate(row.origEndDate),   newV: renderDate(row.newEndDate) },
    { label: 'Days',     orig: renderNum(row.origDays),       newV: renderNum(row.newDays) },
    { label: 'Category', orig: renderStr(row.origCategory),   newV: renderStr(row.newCategory) },
    { label: 'Status',   orig: renderStr(row.origStatus),     newV: renderStr(row.newStatus), isStatus: true },
    { label: 'Active',   orig: renderStr(row.origActive),     newV: renderStr(row.newActive) },
  ];

  return pairs.reduce<DiffEntry[]>((acc, { label, orig, newV, isStatus }) => {
    if (orig !== newV) acc.push({ label, oldVal: orig, newVal: newV, isStatus });
    return acc;
  }, []);
}

// ── Cell components ───────────────────────────────────────────────────────────

function ChangesCell({ row }: { row: TimeOffChangeLogRowDTO }) {
  const diff = buildDiff(row);

  if (diff === 'created') {
    return (
      <div className="flex flex-col gap-0.5 text-xs py-0.5">
        <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 mb-0.5">Created</Badge>
        {row.newStartDate && <span><span className="text-muted-foreground">Start:</span> {renderDate(row.newStartDate)}</span>}
        {row.newEndDate && <span><span className="text-muted-foreground">End:</span> {renderDate(row.newEndDate)}</span>}
        {row.newDays != null && <span><span className="text-muted-foreground">Days:</span> {row.newDays}</span>}
        {row.newCategory && <span><span className="text-muted-foreground">Category:</span> {row.newCategory}</span>}
        {row.newStatus && (
          <Badge variant={statusVariant(row.newStatus)} className="w-fit text-[10px] px-1.5 py-0">
            {row.newStatus}
          </Badge>
        )}
      </div>
    );
  }

  if (diff.length === 0) {
    return <span className="text-muted-foreground text-xs">{EM_DASH}</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      {diff.map(({ label, oldVal, newVal, isStatus }) => (
        <div key={label} className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          {isStatus ? (
            <>
              <Badge variant={statusVariant(oldVal)} className="text-[10px] px-1 py-0 h-auto">{oldVal}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant={statusVariant(newVal)} className="text-[10px] px-1 py-0 h-auto">{newVal}</Badge>
            </>
          ) : (
            <>
              <span className="line-through text-muted-foreground/60">{oldVal}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{newVal}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function CommentCell({ comment }: { comment: string | null }) {
  if (!comment) return <span className="text-muted-foreground text-xs">{EM_DASH}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
          <span className="truncate max-w-[140px]">{comment}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm leading-relaxed" align="start">
        {comment}
      </PopoverContent>
    </Popover>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

export function useChangeLogColumns(): ColumnDef<TimeOffChangeLogRowDTO>[] {
  return useMemo<ColumnDef<TimeOffChangeLogRowDTO>[]>(
    () => [
      {
        accessorKey: 'changeDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change Date" />,
        cell: ({ row }) => renderDate(row.original.changeDate),
        size: 120,
        meta: { headerTitle: 'Change Date', group: 'Context', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'ref',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Ref" />,
        cell: ({ row }) => (
          <div className="text-xs leading-snug">
            <div className="text-muted-foreground">Log #{row.original.changeLogId}</div>
            <div>T/O #{row.original.timeOffId}</div>
          </div>
        ),
        size: 90,
        meta: { headerTitle: 'Ref', group: 'Context', skeleton: <Skeleton className="h-8 w-14" /> },
      },
      {
        accessorKey: 'employeeFullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
        size: 200,
        meta: { headerTitle: 'Employee', group: 'Context', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        size: 120,
        meta: { headerTitle: 'Country', group: 'Context', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'changedByName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changed By" />,
        cell: ({ row }) => renderStr(row.original.changedByName),
        size: 160,
        meta: { headerTitle: 'Changed By', group: 'Context', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'changes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changes" />,
        cell: ({ row }) => <ChangesCell row={row.original} />,
        size: 300,
        enableSorting: false,
        meta: { headerTitle: 'Changes', group: 'Context', skeleton: <Skeleton className="h-10 w-48" /> },
      },
      {
        accessorKey: 'comment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Comment" />,
        cell: ({ row }) => <CommentCell comment={row.original.comment} />,
        size: 200,
        meta: { headerTitle: 'Comment', group: 'Context', skeleton: <Skeleton className="h-4 w-32" /> },
      },
    ],
    [],
  );
}
