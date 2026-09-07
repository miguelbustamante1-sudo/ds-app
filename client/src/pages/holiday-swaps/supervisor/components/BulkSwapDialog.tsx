import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn, formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import type { CreateHolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface HolidayWithMembers {
  holiday: HolidayDTO;
  members: TeamMemberReportDTO[];
}

interface BulkSelections {
  [holidayId: number]: { [teamMemberId: number]: string };
}

export interface BulkSwapItem {
  teamMemberId: number;
  holidayId: number;
  payload: CreateHolidaySwapDTO;
}

interface BulkSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMemberReportDTO[];
  loading: boolean;
  onSave: (items: BulkSwapItem[]) => Promise<void>;
}

const COUNTRY_CODES: Record<string, string> = {
  Guatemala: 'GT',
  'El Salvador': 'SV',
  Mexico: 'MX',
  México: 'MX',
};

function getCountryCode(countryName: string | null | undefined): string | null {
  if (!countryName) return null;
  return COUNTRY_CODES[countryName] ?? countryName.slice(0, 2).toUpperCase();
}

export function BulkSwapDialog({
  open,
  onOpenChange,
  teamMembers,
  loading,
  onSave,
}: BulkSwapDialogProps) {
  const [holidayGroups, setHolidayGroups] = useState<HolidayWithMembers[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selections, setSelections] = useState<BulkSelections>({});

  useEffect(() => {
    if (!open) return;
    setSelections({});
    setExpandedId(null);

    const membersWithCountry = teamMembers.filter((m) => m.countryId !== null);
    const distinctCountryIds = [...new Set(membersWithCountry.map((m) => m.countryId as number))];

    if (distinctCountryIds.length === 0) {
      setHolidayGroups([]);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setHolidaysLoading(true);
    Promise.all(
      distinctCountryIds.map((cId) =>
        apiGet<HolidayDTO[]>(`/api/holidays?cou_id=${cId}`)
          .then((data) => ({ countryId: cId, holidays: data }))
          .catch(() => ({ countryId: cId, holidays: [] as HolidayDTO[] })),
      ),
    )
      .then((results) => {
        const byHolidayId = new Map<number, HolidayWithMembers>();

        results.forEach(({ countryId, holidays }) => {
          const countryMembers = membersWithCountry.filter((m) => m.countryId === countryId);
          holidays
            .filter((h) => {
              if (!h.holidayIsActive) return false;
              return parseUTCDateAsLocal(String(h.holidayDate)) > today;
            })
            .forEach((h) => {
              if (!byHolidayId.has(h.holidayId)) {
                byHolidayId.set(h.holidayId, { holiday: h, members: [] });
              }
              const entry = byHolidayId.get(h.holidayId)!;
              countryMembers.forEach((m) => {
                if (!entry.members.find((em) => em.teamMemberId === m.teamMemberId)) {
                  entry.members.push(m);
                }
              });
            });
        });

        const sorted = [...byHolidayId.values()].sort(
          (a, b) =>
            parseUTCDateAsLocal(String(a.holiday.holidayDate)).getTime() -
            parseUTCDateAsLocal(String(b.holiday.holidayDate)).getTime(),
        );
        setHolidayGroups(sorted);
      })
      .finally(() => setHolidaysLoading(false));
  }, [open, teamMembers]);

  function toggleMember(holidayId: number, teamMemberId: number) {
    setSelections((prev) => {
      const holiday = { ...(prev[holidayId] ?? {}) };
      if (teamMemberId in holiday) {
        delete holiday[teamMemberId];
      } else {
        holiday[teamMemberId] = '';
      }
      return { ...prev, [holidayId]: holiday };
    });
  }

  function setDate(holidayId: number, teamMemberId: number, date: string) {
    setSelections((prev) => ({
      ...prev,
      [holidayId]: { ...(prev[holidayId] ?? {}), [teamMemberId]: date },
    }));
  }

  const readyItems = useMemo<BulkSwapItem[]>(() => {
    const items: BulkSwapItem[] = [];
    Object.entries(selections).forEach(([hIdStr, memberMap]) => {
      const holidayId = Number(hIdStr);
      Object.entries(memberMap as Record<string, string>).forEach(([mIdStr, date]) => {
        if (date) {
          items.push({
            teamMemberId: Number(mIdStr),
            holidayId,
            payload: { holidayId, replacementDate: date },
          });
        }
      });
    });
    return items;
  }, [selections]);

  const checkedCount = useMemo(
    () => Object.values(selections).reduce((sum, m) => sum + Object.keys(m).length, 0),
    [selections],
  );

  async function handleSubmit() {
    if (readyItems.length === 0) return;
    await onSave(readyItems);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>New Holiday Swap(s)</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select a holiday, then check team members and assign replacement dates.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
          {holidaysLoading ? (
            <div className="py-4 space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted" />
              ))}
            </div>
          ) : holidayGroups.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No upcoming holidays found for your team.
              </p>
            </div>
          ) : (
            holidayGroups.map(({ holiday, members }) => {
              const isExpanded = expandedId === holiday.holidayId;
              const code = getCountryCode(holiday.countryName);
              const holidaySelections = selections[holiday.holidayId] ?? {};
              const checkedHere = Object.keys(holidaySelections).length;

              return (
                <div
                  key={holiday.holidayId}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : holiday.holidayId)
                    }
                  >
                    <CalendarDays
                      className="h-4 w-4 text-uds-system-amber-500 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{holiday.holidayName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatUTCDate(holiday.holidayDate)}
                      </span>
                    </div>
                    {code && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-uds-system-blue-50 text-uds-system-blue-700 border border-uds-system-blue-200">
                        {code}
                      </span>
                    )}
                    {checkedHere > 0 && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">
                        {checkedHere} selected
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2.5">
                      {members.map((m) => {
                        const isChecked = m.teamMemberId in holidaySelections;
                        return (
                          <div key={m.teamMemberId} className="flex items-center gap-3">
                            <Checkbox
                              id={`cb-${holiday.holidayId}-${m.teamMemberId}`}
                              checked={isChecked}
                              onCheckedChange={() =>
                                toggleMember(holiday.holidayId, m.teamMemberId)
                              }
                            />
                            <label
                              htmlFor={`cb-${holiday.holidayId}-${m.teamMemberId}`}
                              className="text-sm cursor-pointer flex-1 min-w-0 truncate select-none"
                            >
                              {m.teamMemberNames} {m.teamMemberSurnames}
                            </label>
                            {isChecked && (
                              <Input
                                type="date"
                                className="h-7 w-36 text-xs"
                                value={holidaySelections[m.teamMemberId] ?? ''}
                                onChange={(e) =>
                                  setDate(holiday.holidayId, m.teamMemberId, e.target.value)
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          {checkedCount > 0 && (
            <span className="text-sm text-muted-foreground mr-auto">
              {readyItems.length}/{checkedCount}{' '}
              {checkedCount === 1 ? 'swap' : 'swaps'} ready
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || readyItems.length === 0}>
            {loading
              ? 'Creating…'
              : `Create ${readyItems.length > 0 ? readyItems.length + ' ' : ''}Swap${readyItems.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
