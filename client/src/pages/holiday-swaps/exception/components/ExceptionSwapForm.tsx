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

interface SupervisorOption {
  userId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

interface ExceptionSwapFormProps {
  countryId: number | null;
  editingSwap: HolidaySwapDTO | null;
  loading: boolean;
  onSubmit: (holidayId: number, replacementDate: string, onBehalfOf: number) => Promise<void>;
  onCancelEdit: () => void;
}

export function ExceptionSwapForm({
  countryId,
  editingSwap,
  loading,
  onSubmit,
  onCancelEdit,
}: ExceptionSwapFormProps) {
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState<number | null>(null);
  const [replacementDate, setReplacementDate] = useState<string>('');
  const [selectedOnBehalfOf, setSelectedOnBehalfOf] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all active holidays for the current calendar year
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const url = countryId ? `/api/holidays?cou_id=${countryId}` : '/api/holidays';
        const data = await apiGet<HolidayDTO[]>(url);
        const currentYear = new Date().getFullYear();
        const eligible = data.filter((h) => {
          if (!h.holidayIsActive) return false;
          return parseUTCDateAsLocal(String(h.holidayDate)).getFullYear() === currentYear;
        });
        setHolidays(eligible);
      } catch {
        setHolidays([]);
      }
    };
    fetchHolidays();
  }, [countryId]);

  // Load supervisors with userId on mount
  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        const data = await apiGet<SupervisorOption[]>('/api/team-members/supervisors-with-user-id');
        setSupervisors(data);
      } catch {
        setSupervisors([]);
      }
    };
    fetchSupervisors();
  }, []);

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
      setError('Please enter a replacement date.');
      return;
    }
    if (!selectedOnBehalfOf) {
      setError('Please select a "Created By" supervisor.');
      return;
    }
    try {
      await onSubmit(selectedHolidayId, replacementDate, selectedOnBehalfOf);
      setSelectedHolidayId(null);
      setReplacementDate('');
      setSelectedOnBehalfOf(null);
    } catch {
      // error surfaced via onError in parent
    }
  }

  const isEditMode = editingSwap !== null;

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

  const supervisorOptions = supervisors.map((s) => ({
    value: String(s.userId),
    label: `${s.teamMemberNames} ${s.teamMemberSurnames}`,
  }));

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarArrowDown className="h-4 w-4" />
            {isEditMode ? `Edit Swap #${editingSwap!.holidaySwapId}` : 'New Holiday Swap Exception'}
          </CardTitle>
          {isEditMode && (
            <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={loading}>
              <X className="h-4 w-4 mr-1" />
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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

          <div className="space-y-1.5">
            <Label>Created By</Label>
            <ComboBox
              options={supervisorOptions}
              value={selectedOnBehalfOf ? String(selectedOnBehalfOf) : ''}
              onValueChange={(v) => setSelectedOnBehalfOf(v ? Number(v) : null)}
              placeholder="Search supervisors..."
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
