import { useState, useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { apiDelete, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { EndorsementBonusDTO, BonusSubcategoryDTO } from '@shared/dto';
import { BonusEditRow } from './BonusEditRow';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMetadata(metadata: Record<string, unknown>): string {
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

export function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BonusDetailTableProps {
  bonuses: EndorsementBonusDTO[];
  subcategories: BonusSubcategoryDTO[];
  isEditing: boolean;
  onDeleted: () => void;
  onSaved: () => void;
  endorsementStartDate: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BonusDetailTable({
  bonuses,
  subcategories,
  isEditing,
  onDeleted,
  onSaved,
  endorsementStartDate,
}: BonusDetailTableProps) {
  const { toast } = useToast();

  const [editingBonusId, setEditingBonusId] = useState<number | null>(null);
  const [deletingBonus, setDeletingBonus] = useState<EndorsementBonusDTO | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const subcategoryMap = useMemo(() => {
    const map = new Map<number, BonusSubcategoryDTO>();
    for (const sub of subcategories) {
      map.set(sub.bonusSubcategoryId, sub);
    }
    return map;
  }, [subcategories]);

  const handleConfirmDelete = async () => {
    if (!deletingBonus) return;
    try {
      setDeletingId(deletingBonus.endorsementBonusId);
      await apiDelete(`/api/endorsement-bonuses/${deletingBonus.endorsementBonusId}`);
      setDeletingBonus(null);
      onDeleted();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete bonus';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBonusSaved = () => {
    setEditingBonusId(null);
    onSaved();
  };

  const colSpan = isEditing ? 5 : 4;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bonus</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Notes</TableHead>
            {isEditing && <TableHead className="w-[80px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bonuses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                No bonuses attached to this endorsement.
              </TableCell>
            </TableRow>
          ) : (
            bonuses.map((bonus) => {
              if (isEditing && editingBonusId === bonus.endorsementBonusId) {
                return (
                  <BonusEditRow
                    key={bonus.endorsementBonusId}
                    bonus={bonus}
                    subcategory={subcategoryMap.get(bonus.bonusSubcategoryId ?? -1)}
                    endorsementStartDate={endorsementStartDate}
                    onSave={handleBonusSaved}
                    onCancel={() => setEditingBonusId(null)}
                    isEditing={isEditing}
                  />
                );
              }

              const sub = subcategoryMap.get(bonus.bonusSubcategoryId ?? -1);
              return (
                <TableRow key={bonus.endorsementBonusId}>
                  <TableCell>
                    <div className="font-medium">{sub?.bonusSubcategoryName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {sub?.bonusCategory?.bonusCategoryName ?? ''}
                    </div>
                  </TableCell>
                  <TableCell>{formatAmount(bonus.endorsementBonusAmount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatMetadata(bonus.endorsementBonusMetadata as Record<string, unknown>)}
                  </TableCell>
                  <TableCell className="text-sm">{bonus.endorsementBonusComments ?? '—'}</TableCell>
                  {isEditing && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingBonusId(bonus.endorsementBonusId)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingBonus(bonus)}
                          disabled={deletingId === bonus.endorsementBonusId}
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!deletingBonus}
        onOpenChange={(open) => {
          if (!open) setDeletingBonus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bonus</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bonus? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
