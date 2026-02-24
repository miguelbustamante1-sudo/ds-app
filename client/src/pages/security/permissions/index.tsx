import { Save } from 'lucide-react';
import { usePermissionsMatrix } from '@/hooks/usePermissionsMatrix';
import { usePermissions } from '@/hooks/usePermissions';
import { ComboBox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';

export function PermissionsPage() {
  const {
    roles,
    selectedRoleId,
    setSelectedRoleId,
    matrix,
    loading,
    saving,
    toggleFlag,
    saveChanges,
    hasDirty,
  } = usePermissionsMatrix();

  const { canRead, canCreate } = usePermissions();
  const canEdit = canCreate('RBACPermissions');

  if (!canRead('RBACPermissions')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  const roleOptions = roles.map((r) => ({
    value: String(r.roleId),
    label: r.roleName,
  }));

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Security › Permissions Matrix</ToolbarPageTitle>
          <ToolbarDescription>Manage read/write/delete flags for each role</ToolbarDescription>
        </ToolbarHeading>
        {canEdit && (
          <ToolbarActions>
            <Button
              onClick={saveChanges}
              disabled={!hasDirty || saving}
            >
              <Save size={16} className="me-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </ToolbarActions>
        )}
      </Toolbar>

      {/* Role selector */}
      <div className="mt-6 max-w-sm">
        <ComboBox
          options={roleOptions}
          value={selectedRoleId !== null ? String(selectedRoleId) : ''}
          onValueChange={(val) => setSelectedRoleId(val ? Number(val) : null)}
          placeholder="Select a role..."
          searchPlaceholder="Search roles..."
          emptyMessage="No roles found."
        />
      </div>

      {/* Content area */}
      <div className="mt-6">
        {!selectedRoleId && (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
            Select a role to view its permissions
          </div>
        )}

        {selectedRoleId && loading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {selectedRoleId && !loading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Resource</TableHead>
                <TableHead className="w-[20%] text-center">Read</TableHead>
                <TableHead className="w-[20%] text-center">Write</TableHead>
                <TableHead className="w-[20%] text-center">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow key={row.option.optionId} data-dirty={row.dirty || undefined}>
                  <TableCell className="font-medium">
                    {row.option.optionDescription ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.read}
                      onCheckedChange={() => toggleFlag(row.option.optionId, 'read')}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.write}
                      onCheckedChange={() => toggleFlag(row.option.optionId, 'write')}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.del}
                      onCheckedChange={() => toggleFlag(row.option.optionId, 'del')}
                      disabled={!canEdit}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
