import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TimeOffHubScopeToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Shared "direct reports only / full hierarchy" toggle, used by both the
 * hub page's summary cards and the summary drill-down page. */
export function TimeOffHubScopeToggle({ checked, onCheckedChange }: TimeOffHubScopeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="time-off-hub-scope"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(!!value)}
      />
      <Label htmlFor="time-off-hub-scope" className="text-sm text-muted-foreground">
        Include full reporting hierarchy
      </Label>
    </div>
  );
}
