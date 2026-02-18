import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPut, ApiError } from '@/lib/api';
import type { EndorsementBonusDTO, BonusSubcategoryDTO, UpdateEndorsementBonusDTO } from '@shared/dto';
import { BonusMetadataFields } from '../components/BonusMetadataFields';

// ── Props ─────────────────────────────────────────────────────────────────────

interface BonusEditRowProps {
  bonus: EndorsementBonusDTO;
  subcategory: BonusSubcategoryDTO | undefined;
  endorsementStartDate: string;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BonusEditRow({
  bonus,
  subcategory,
  endorsementStartDate,
  onSave,
  onCancel,
  isEditing,
}: BonusEditRowProps) {
  const { toast } = useToast();

  const [amount, setAmount] = useState<number | null>(
    bonus.endorsementBonusAmount != null ? Number(bonus.endorsementBonusAmount) : null,
  );
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    (bonus.endorsementBonusMetadata as Record<string, unknown>) ?? {},
  );
  const [comments, setComments] = useState<string>(bonus.endorsementBonusComments ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: UpdateEndorsementBonusDTO = {
        endorsementBonusAmount: amount,
        endorsementBonusMetadata: metadata,
        endorsementBonusComments: comments || null,
      };
      await apiPut<void, UpdateEndorsementBonusDTO>(
        `/api/endorsement-bonuses/${bonus.endorsementBonusId}`,
        payload,
      );
      onSave();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save bonus';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell colSpan={isEditing ? 5 : 4} className="py-3">
        <div className="space-y-3 p-2 bg-muted/30 rounded-md">
          {/* Row 1: subcategory name (read-only label) + Amount input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Bonus</Label>
              <p className="text-sm font-medium">{subcategory?.bonusSubcategoryName ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`amount-${bonus.endorsementBonusId}`}>Amount</Label>
              <Input
                id={`amount-${bonus.endorsementBonusId}`}
                type="number"
                step="0.01"
                min="0"
                value={amount ?? ''}
                onChange={(e) => setAmount(e.target.value === '' ? null : Number(e.target.value))}
                disabled={saving}
              />
            </div>
          </div>

          {/* Row 2: dynamic metadata fields (if schema has fields) */}
          {subcategory && Object.keys(subcategory.bonusSubcategoryMetadata ?? {}).length > 0 && (
            <BonusMetadataFields
              metadataSchema={subcategory.bonusSubcategoryMetadata}
              metadataValues={metadata}
              onMetadataChange={(key, value) =>
                setMetadata((prev) => ({ ...prev, [key]: value }))
              }
              endorsementStartDate={endorsementStartDate}
            />
          )}

          {/* Row 3: Comments + Save/Cancel */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`comments-${bonus.endorsementBonusId}`}>Comments</Label>
              <Input
                id={`comments-${bonus.endorsementBonusId}`}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
