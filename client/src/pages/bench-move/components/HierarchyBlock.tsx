import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import type { SupervisorChainDTO } from '@shared/dto';
import type { SupervisorListItemDTO } from '../hooks/useTeamMemberBenchData';

interface HierarchyBlockProps {
  supervisorOptions: SupervisorListItemDTO[];
  supervisorChain: SupervisorChainDTO[];
  selectedL1Id: number | null;
  onL1Change: (id: number) => void;
}

export function HierarchyBlock({
  supervisorOptions,
  supervisorChain,
  selectedL1Id,
  onL1Change,
}: HierarchyBlockProps) {
  const l2 = supervisorChain.find((c) => c.level === 2);
  const l3 = supervisorChain.find((c) => c.level === 3);

  const supervisorComboOptions = supervisorOptions.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporting Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>L1 — Direct Supervisor</Label>
            <ComboBox
              options={supervisorComboOptions}
              value={selectedL1Id ? String(selectedL1Id) : ''}
              onValueChange={(v) => v && onL1Change(Number(v))}
              placeholder="Select supervisor..."
              searchPlaceholder="Search by name..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              L2 — Supervisor's Supervisor
            </Label>
            <p className="text-sm">
              {l2 ? `${l2.teamMemberNames} ${l2.teamMemberSurnames}` : '—'}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              L3
            </Label>
            <p className="text-sm">
              {l3 ? `${l3.teamMemberNames} ${l3.teamMemberSurnames}` : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
