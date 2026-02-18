import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUTCDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SelectedBonus } from './types';

interface BonusSummaryTableProps {
  bonuses: SelectedBonus[];
  onRemove: (bonusSubcategoryId: number) => void;
}

function toLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const pairs = Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const label = toLabel(k);
      if (typeof v === 'boolean') return `${label}: ${v ? 'Yes' : 'No'}`;
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
        return `${label}: ${formatUTCDate(v)}`;
      }
      return `${label}: ${v}`;
    });
  return pairs.length > 0 ? pairs.join(', ') : '—';
}

function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function BonusSummaryTable({ bonuses, onRemove }: BonusSummaryTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bonus Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bonuses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No bonuses added yet
              </TableCell>
            </TableRow>
          ) : (
            bonuses.map((bonus) => (
              <TableRow key={bonus.bonusSubcategoryId}>
                <TableCell>
                  <div className="font-medium">{bonus.bonusSubcategoryName}</div>
                  {bonus.bonusCategoryName && (
                    <div className="text-xs text-muted-foreground">{bonus.bonusCategoryName}</div>
                  )}
                </TableCell>
                <TableCell>{formatAmount(bonus.endorsementBonusAmount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatMetadata(bonus.endorsementBonusMetadata)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(bonus.bonusSubcategoryId)}
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
