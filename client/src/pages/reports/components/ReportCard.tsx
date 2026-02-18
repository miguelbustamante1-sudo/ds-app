import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGate } from '@/components/PermissionGate';
import type { ReportEntry } from '../registry';

interface ReportCardProps {
  entry: ReportEntry;
}

function ReportCardInner({ entry }: ReportCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(entry.path)}
    >
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-primary">
          <FileText size={18} />
          <span className="font-semibold text-sm">{entry.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{entry.description}</p>
      </CardContent>
    </Card>
  );
}

export function ReportCard({ entry }: ReportCardProps) {
  if (entry.permission) {
    return (
      <PermissionGate resource={entry.permission}>
        <ReportCardInner entry={entry} />
      </PermissionGate>
    );
  }

  return <ReportCardInner entry={entry} />;
}
