import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Time } from '@internationalized/date';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimeField, DateInput } from '@/components/ui/datefield';
import { cn } from '@/lib/utils';

interface CycleDateTimeFieldProps {
  label: string;
  required?: boolean;
  date: Date | null;
  time: string;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string) => void;
  error?: string;
}

function timeFromString(value: string): Time | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return new Time(h, min);
}

function timeToString(t: Time | null): string {
  if (!t) return '';
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

export function CycleDateTimeField({
  label,
  required,
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
}: CycleDateTimeFieldProps) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-40 justify-start font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon size={14} className="me-1 shrink-0" />
              {date ? format(date, 'dd-MMM-yyyy') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={(d) => onDateChange(d ?? null)}
            />
          </PopoverContent>
        </Popover>

        <TimeField
          value={timeFromString(time)}
          onChange={(t) => onTimeChange(timeToString(t))}
          hourCycle={24}
          granularity="minute"
        >
          <DateInput />
        </TimeField>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Combine a Date + "HH:mm" string into an ISO datetime string for the API */
export function combineDateAndTime(date: Date | null, time: string): string {
  if (!date) return '';
  const [h, m] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result.toISOString();
}

/** Split an ISO datetime string into { date: Date, time: "HH:mm" } */
export function splitIsoDateTime(iso: string): { date: Date; time: string } {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return { date: d, time: `${h}:${m}` };
}
