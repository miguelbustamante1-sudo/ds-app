import { IMaskInput } from 'react-imask';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * 24-hour masked time input (HH:MM).
 * The mask 00:00 enforces digits-only and auto-places the colon.
 */
export function TimeInput({ value, onChange, className, disabled }: TimeInputProps) {
  return (
    <IMaskInput
      mask="00:00"
      value={value}
      disabled={disabled}
      placeholder="HH:MM"
      onAccept={(val: string) => onChange(val)}
      className={cn(
        'h-8 w-20 rounded-md border border-input bg-background px-2 text-sm',
        'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    />
  );
}
