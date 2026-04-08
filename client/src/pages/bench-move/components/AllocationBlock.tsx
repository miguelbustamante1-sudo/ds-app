import { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';
import type { FunctionalAreaDTO } from '@shared/dto';

interface AllocationBlockProps {
  functionalAreaId: number | null;
  allocation: string;
  startDate: string;
  onFunctionalAreaChange: (id: number) => void;
  onAllocationChange: (value: string) => void;
  onStartDateChange: (date: string) => void;
}

export function AllocationBlock({
  functionalAreaId,
  allocation,
  startDate,
  onFunctionalAreaChange,
  onAllocationChange,
  onStartDateChange,
}: AllocationBlockProps) {
  const [functionalAreas, setFunctionalAreas] = useState<FunctionalAreaDTO[]>([]);

  useEffect(() => {
    apiGet<FunctionalAreaDTO[]>('/api/functional-areas')
      .then(setFunctionalAreas)
      .catch(() => setFunctionalAreas([]));
  }, []);

  const areaOptions = functionalAreas.map((fa) => ({
    value: String(fa.Id),
    label: fa.Name,
  }));

  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4">Bench Allocation</CardTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Functional Area <span className="text-destructive">*</span>
            </Label>
            <ComboBox
              options={areaOptions}
              value={functionalAreaId ? String(functionalAreaId) : ''}
              onValueChange={(v) => v && onFunctionalAreaChange(Number(v))}
              placeholder="Select functional area..."
              searchPlaceholder="Search..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Allocation (0.01 – 1.00) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="1.00"
              value={allocation}
              onChange={(e) => onAllocationChange(e.target.value)}
              placeholder="e.g. 1.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
