import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface BonusMetadataFieldsProps {
  metadataSchema: Record<string, string>;
  metadataValues: Record<string, unknown>;
  onMetadataChange: (key: string, value: unknown) => void;
  endorsementStartDate?: string;
}

function toLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function BonusMetadataFields({
  metadataSchema,
  metadataValues,
  onMetadataChange,
  endorsementStartDate,
}: BonusMetadataFieldsProps) {
  const keys = Object.keys(metadataSchema);

  // Identify the end_date key and the "anchor" date key (any date field that isn't end_date)
  const endDateKey = keys.find((k) => k.toLowerCase().includes('end_date'));
  const anchorDateKey = keys.find(
    (k) => metadataSchema[k] === 'date' && !k.toLowerCase().includes('end_date'),
  );

  // Apply smart date defaults when schema first mounts or endorsementStartDate changes.
  // - Fields named *start_date* → endorsement start date
  // - end_date → anchor date value + 9 months (only when the anchor is a *start_date* field,
  //   meaning the initial value is known; for anchors like date_of_proof_of_study the user
  //   enters the value manually and end_date is updated reactively via handleDateChange).
  useEffect(() => {
    if (!endorsementStartDate) return;

    const anchorIsStartDate = anchorDateKey?.toLowerCase().includes('start_date') ?? false;

    keys.forEach((key) => {
      const type = metadataSchema[key];
      if (type !== 'date') return;

      const currentValue = metadataValues[key];
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') return;

      if (key.toLowerCase().includes('start_date')) {
        onMetadataChange(key, endorsementStartDate);
      } else if (key.toLowerCase().includes('end_date') && anchorIsStartDate) {
        onMetadataChange(key, addMonths(endorsementStartDate, 9));
      }
    });
    // Intentionally omit metadataValues — only re-run when schema or startDate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataSchema, endorsementStartDate]);

  // When any non-end_date date field changes, auto-update end_date to value + 9 months
  function handleDateChange(key: string, value: string) {
    onMetadataChange(key, value);
    if (endDateKey && value) {
      onMetadataChange(endDateKey, addMonths(value, 9));
    }
  }

  if (keys.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {keys.map((key) => {
        const type = metadataSchema[key];
        const rawValue = metadataValues[key];

        if (type === 'boolean') {
          return (
            <div key={key} className="space-y-2">
              <Label>{toLabel(key)}</Label>
              <div className="flex items-center h-9">
                <Switch
                  checked={Boolean(rawValue)}
                  onCheckedChange={(val) => onMetadataChange(key, val)}
                />
              </div>
            </div>
          );
        }

        const inputType =
          type === 'number' ? 'number'
          : type === 'date' ? 'date'
          : 'text';

        const stringValue =
          rawValue === undefined || rawValue === null ? '' : String(rawValue);

        return (
          <div key={key} className="space-y-2">
            <Label>{toLabel(key)}</Label>
            <Input
              type={inputType}
              value={stringValue}
              onChange={(e) => {
                const val = e.target.value;
                if (type === 'number') {
                  onMetadataChange(key, val === '' ? '' : Number(val));
                } else if (type === 'date' && key !== endDateKey) {
                  handleDateChange(key, val);
                } else {
                  onMetadataChange(key, val);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
