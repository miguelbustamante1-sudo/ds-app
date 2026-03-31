import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { useCreateSwap } from '../hooks/useCreateSwap';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface RequestSwapDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (swap: HolidaySwapDTO) => void;
}

export function RequestSwapDialog({ open, onClose, onSuccess }: RequestSwapDialogProps) {

  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState<number | null>(null);
  const [replacementDate, setReplacementDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { createSwap, loading } = useCreateSwap({
    onSuccess: (swap) => {
      onSuccess(swap);
      handleClose();
    },
    onError: (msg) => setError(msg),
  });

  useEffect(() => {
    if (!open) return;
    const fetchHolidays = async () => {
      try {
        let url = '/api/holidays';
        const profile = await apiGet<{ countryId: number | null }>('/api/team-members/me');
        if (profile.countryId) {
          url = `/api/holidays?cou_id=${profile.countryId}`;
        }
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
  }, [open]);

  function handleClose() {
    setSelectedHolidayId(null);
    setReplacementDate('');
    setError(null);
    onClose();
  }

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
      await createSwap({ holidayId: selectedHolidayId, replacementDate });
    } catch {
      // error already handled by onError callback
    }
  }

  const holidayOptions = holidays.map((h) => ({
    value: String(h.holidayId),
    label: `${h.holidayName} (${formatUTCDate(h.holidayDate)})`,
  }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Holiday Swap</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Holiday to Swap</Label>
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

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
