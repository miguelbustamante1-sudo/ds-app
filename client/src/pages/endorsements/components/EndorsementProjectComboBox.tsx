import { useEffect, useState, useCallback } from 'react';
import type { ProjectDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementProjectComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementProjectComboBox({ value, onValueChange, disabled }: EndorsementProjectComboBoxProps) {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ProjectDTO[]>('/api/projects');
      setProjects(data);
    } catch {
      console.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

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
      placeholder={loading ? 'Loading projects...' : 'Select a project'}
      searchPlaceholder="Search projects..."
      emptyMessage="No projects found."
      disabled={disabled || loading}
    />
  );
}
