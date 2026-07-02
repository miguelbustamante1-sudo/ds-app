import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import type { StoredProcedureSummaryDTO } from '@shared/dto/StoredProcedure';

interface Step1Props {
  procedures: StoredProcedureSummaryDTO[];
  selectedId: number | null;
  onSelect: (spId: number) => void;
}

export function Step1ProcedurePicker({ procedures, selectedId, onSelect }: Step1Props) {
  const options = useMemo(() => {
    return procedures.map((p) => ({
      value: String(p.spId),
      label: p.spLabel,
      description: p.spDescription,
    }));
  }, [procedures]);

  const selectedValue = selectedId ? String(selectedId) : '';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Select a Procedure</h3>
      <Label htmlFor="procedure-picker">
        Procedure <span className="text-destructive">*</span>
      </Label>
      <ComboBox
        options={options}
        value={selectedValue}
        onValueChange={(value) => onSelect(Number(value))}
        placeholder="Search and select a procedure..."
        searchPlaceholder="Type procedure name..."
      />
      {selectedValue && (
        <div className="text-sm text-muted-foreground">
          {procedures.find((p) => p.spId === Number(selectedValue))?.spDescription}
        </div>
      )}
    </div>
  );
}
