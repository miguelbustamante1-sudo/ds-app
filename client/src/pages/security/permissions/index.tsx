import { Loader2 } from 'lucide-react';
import { usePermissionsMatrix } from '@/hooks/usePermissionsMatrix';
import { usePermissions } from '@/hooks/usePermissions';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';

const FLAG_LABELS: Record<'read' | 'write' | 'del', string> = {
  read: 'Read',
  write: 'Write',
  del: 'Delete',
};

export function PermissionsPage() {
  const {
    roles,
    selectedRoleId,
    setSelectedRoleId,
    matrix,
    loading,
    savingOptionId,
    toggleFlag,
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
      </Toolbar>

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

      <div className="mt-6">
        {!selectedRoleId && (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
            Select a role to view its permissions
          </div>
        )}

        {selectedRoleId && loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        )}

        {selectedRoleId && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {matrix.map((row) => {
              const isSaving = savingOptionId === row.option.optionId;
              return (
                <Card key={row.option.optionId}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <p
                        className="text-sm font-medium truncate leading-tight"
                        title={row.option.optionDescription ?? ''}
                      >
                        {row.option.optionDescription ?? '—'}
                      </p>
                      {isSaving && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['read', 'write', 'del'] as const).map((flag) => (
                        <Button
                          key={flag}
                          size="sm"
                          variant="outline"
                          className={`h-7 px-2 text-xs border ${
                            row[flag]
                              ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                          }`}
                          onClick={() => toggleFlag(row.option.optionId, flag)}
                          disabled={!canEdit || isSaving}
                        >
                          {FLAG_LABELS[flag]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
