import { useEffect, useState, useCallback } from 'react';
import type { ProjectDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface ProjectComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelectFull?: (project: ProjectDTO | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProjectComboBox({ value, onValueChange, onSelectFull, placeholder, disabled }: ProjectComboBoxProps) {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ProjectDTO[]>('/api/team-member-projects/active-projects');
      setProjects(data);
    } catch {
      console.error('Failed to load active projects');
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
      p.projectSow ? `SOW: ${p.projectSow}` : null,
    ]
      .filter(Boolean)
      .join(' — '),
  }));

  const handleValueChange = (val: string) => {
    onValueChange(val);
    if (onSelectFull) {
      const project = projects.find((p) => p.projectId.toString() === val) ?? null;
      onSelectFull(project);
    }
  };

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={handleValueChange}
      placeholder={loading ? 'Loading projects...' : (placeholder ?? 'Select a project')}
      searchPlaceholder="Search projects..."
      emptyMessage="No active projects found."
      disabled={disabled || loading}
    />
  );
}
