import { useEffect, useState, useCallback } from 'react';
import type { ProjectDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementProjectComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  clientId?: string;
  disabled?: boolean;
}

export function EndorsementProjectComboBox({ value, onValueChange, clientId, disabled }: EndorsementProjectComboBoxProps) {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId ? `/api/projects?clientId=${clientId}` : '/api/projects';
      const data = await apiGet<ProjectDTO[]>(url);
      setProjects(data);
    } catch {
      console.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const options: ComboBoxOption[] = projects.map((p) => ({
    value: p.projectId.toString(),
    label: [
      p.projectName,
      p.projectExternalId ? `(${p.projectExternalId})` : null,
    ]
      .filter(Boolean)
      .join(' — '),
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading projects...' : clientId ? 'Select a project' : 'Select a client first'}
      searchPlaceholder="Search projects..."
      emptyMessage="No projects found."
      disabled={disabled || loading || !clientId}
    />
  );
}
