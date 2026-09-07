import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { CalendarArrowDown, X } from 'lucide-react';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

interface SupervisorSwapFormProps {
  teamMember: TeamMemberReportDTO;
  editingSwap: HolidaySwapDTO | null;
  loading: boolean;
  onSubmit: (holidayId: number, replacementDate: string) => Promise<void>;
  onCancelEdit: () => void;
}

export function SupervisorSwapForm({
  teamMember,
  editingSwap,
  loading,
  onSubmit,
  onCancelEdit,
}: SupervisorSwapFormProps) {
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState<number | null>(null);
  const [replacementDate, setReplacementDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load holidays for the team member's country
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const url = teamMember.countryId
          ? `/api/holidays?cou_id=${teamMember.countryId}`
          : '/api/holidays';
        const data = await apiGet<HolidayDTO[]>(url);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const future = data.filter((h) => {
          if (!h.holidayIsActive) return false;
          const d = parseUTCDateAsLocal(String(h.holidayDate));
          return d > today;
        });
        setHolidays(future);
      } catch {
        setHolidays([]);
      }
    };
    fetchHolidays();
  }, [teamMember.countryId]);

  // Populate form when entering edit mode
  useEffect(() => {
    if (editingSwap) {
      setSelectedHolidayId(editingSwap.holidayId);
      const d = parseUTCDateAsLocal(String(editingSwap.replacementDate));
      const iso = d.toISOString().split('T')[0] ?? '';
      setReplacementDate(iso);
      setError(null);
    } else {
      setSelectedHolidayId(null);
      setReplacementDate('');
      setError(null);
    }
  }, [editingSwap]);

  async function handleSubmit() {
    setError(null);
    if (!selectedHolidayId) {
      setError('Please select a holiday.');
      return;
    }
    if (!replacementDate) {
      setError('Please select a replacement date.');
      return;
    }
    try {
      await onSubmit(selectedHolidayId, replacementDate);
      setSelectedHolidayId(null);
      setReplacementDate('');
    } catch {
      // error surfaced via onError in parent
    }
  }

  const isEditMode = editingSwap !== null;

  // When editing, include the current holiday even if it's past (so it shows in the list)
  const holidayOptions = (() => {
    const opts = holidays.map((h) => ({
      value: String(h.holidayId),
      label: `${h.holidayName} (${formatUTCDate(h.holidayDate)})`,
    }));
    if (isEditMode && editingSwap && !holidays.find((h) => h.holidayId === editingSwap.holidayId)) {
      opts.unshift({
        value: String(editingSwap.holidayId),
        label: editingSwap.holidayName,
      });
    }
    return opts;
  })();

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarArrowDown className="h-4 w-4" />
            {isEditMode ? `Edit Swap #${editingSwap!.holidaySwapId}` : 'New Holiday Swap'}
          </CardTitle>
          {isEditMode && (
            <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={loading}>
              <X className="h-4 w-4 mr-1" />
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Holiday</Label>
            <ComboBox
              options={holidayOptions}
              value={selectedHolidayId ? String(selectedHolidayId) : ''}
              onValueChange={(v) => setSelectedHolidayId(v ? Number(v) : null)}
              placeholder="Search holidays..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Replacement Date</Label>
            <Input
              type="date"
              value={replacementDate}
              onChange={(e) => setReplacementDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading
                ? isEditMode
                  ? 'Saving…'
                  : 'Submitting…'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Swap'}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </CardContent>
    </Card>
  );
}
