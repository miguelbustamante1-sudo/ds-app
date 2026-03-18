import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboBox } from '@/components/ui/combobox';
import { Switch, SwitchIndicator } from '@/components/ui/switch';
import { apiGet } from '@/lib/api';
import type { ReportDefinitionSummaryDTO } from '@shared/dto/DynamicReport';

interface RbacOption {
  optionId: number;
  optionDescription: string;
}

interface Step3MetadataProps {
  reportName: string;
  reportDescription: string;
  reportGroup: string;
  reportPermission: string;
  reportActive: boolean;
  onChange: (field: string, value: string | boolean) => void;
  nameError?: string;
}

export function Step3Metadata({
  reportName,
  reportDescription,
  reportGroup,
  reportPermission,
  reportActive,
  onChange,
  nameError,
}: Step3MetadataProps) {
  const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    // Load existing groups from active reports
    apiGet<ReportDefinitionSummaryDTO[]>('/api/reports/dynamic').then((reports) => {
      const unique = [...new Set(reports.map((r) => r.reportGroup).filter(Boolean))];
      setGroupOptions(unique.map((g) => ({ value: g, label: g })));
    }).catch(() => {});

    // Load RBAC options for permission field
    apiGet<RbacOption[]>('/api/rbac/options').then((opts) => {
      setPermissionOptions(opts.map((o) => ({ value: o.optionDescription, label: o.optionDescription })));
    }).catch(() => {});
  }, []);

  // Allow typing a new group value not in the list
  return (
    <div className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="reportName">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reportName"
          value={reportName}
          onChange={(e) => onChange('reportName', e.target.value)}
          placeholder="e.g., Monthly Headcount Report"
        />
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="reportDescription">Description</Label>
        <Textarea
          id="reportDescription"
          value={reportDescription}
          onChange={(e) => onChange('reportDescription', e.target.value)}
          placeholder="Brief description of this report..."
          rows={3}
        />
      </div>

      {/* Group */}
      <div className="space-y-1">
        <Label>Group</Label>
        <Input
          value={reportGroup}
          onChange={(e) => onChange('reportGroup', e.target.value)}
          placeholder="e.g., Time Off, Payroll..."
          list="group-suggestions"
        />
        {groupOptions.length > 0 && (
          <datalist id="group-suggestions">
            {groupOptions.map((g) => (
              <option key={g.value} value={g.value} />
            ))}
          </datalist>
        )}
        <p className="text-xs text-muted-foreground">Type a new group or choose an existing one.</p>
      </div>

      {/* Permission */}
      <div className="space-y-1">
        <Label>Permission Resource</Label>
        <ComboBox
          options={permissionOptions}
          value={reportPermission}
          onValueChange={(val) => onChange('reportPermission', val)}
          placeholder="Select permission resource..."
          searchPlaceholder="Search resources..."
        />
        <p className="text-xs text-muted-foreground">
          Users must have read access to this resource to see the report.
        </p>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <Switch
          checked={reportActive}
          onCheckedChange={(checked) => onChange('reportActive', checked)}
        >
          <SwitchIndicator />
        </Switch>
        <Label className="cursor-pointer">Active</Label>
      </div>
    </div>
  );
}
