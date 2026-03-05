import { useEffect, useState } from 'react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { REPORTS_REGISTRY, type ReportEntry } from './registry';
import { ReportCard } from './components/ReportCard';
import { ReportsSearch } from './components/ReportsSearch';
import { listActiveReports } from './dynamic/api';

export function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dynamicEntries, setDynamicEntries] = useState<ReportEntry[]>([]);

  useEffect(() => {
    listActiveReports().then((reports) => {
      const entries: ReportEntry[] = reports.map((r) => ({
        id: `dynamic-${r.reportId}`,
        title: r.reportName,
        description: r.reportDescription ?? '',
        path: `/reports/dynamic/${r.reportId}/run`,
        group: r.reportGroup,
        permission: r.reportPermission ?? undefined,
        isDynamic: true,
      }));
      setDynamicEntries(entries);
    }).catch(() => {});
  }, []);

  const allEntries = [...REPORTS_REGISTRY, ...dynamicEntries];

  const filtered = allEntries.filter((entry) => {
    const term = searchTerm.toLowerCase();
    return (
      entry.title.toLowerCase().includes(term) ||
      entry.description.toLowerCase().includes(term)
    );
  });

  const grouped = filtered.reduce<Record<string, typeof allEntries>>(
    (acc, entry) => {
      if (!acc[entry.group]) acc[entry.group] = [];
      acc[entry.group].push(entry);
      return acc;
    },
    {},
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Reports</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <ReportsSearch value={searchTerm} onChange={setSearchTerm} />
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 flex flex-col gap-8">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports match your search.</p>
        ) : (
          Object.entries(grouped).map(([group, entries]) => (
            <section key={group}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {group}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entries.map((entry) => (
                  <ReportCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
