import { Lock } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUTCDate } from '@/lib/utils';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';

function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const s = statusName.toLowerCase();
  if (s.includes('approved')) return 'success';
  if (s.includes('tentative') || s.includes('pending')) return 'secondary';
  if (s.includes('cancelled') || s.includes('rejected')) return 'destructive';
  return 'outline';
}

interface SiblingReadOnlyCardProps {
  sibling: TimeOffWithDetailsDTO;
  label: string;
}

export function SiblingReadOnlyCard({ sibling, label }: SiblingReadOnlyCardProps) {
  return (
    <Card className="border-dashed opacity-80">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            {label} — linked (read only)
          </CardTitle>
          <Badge variant={getStatusVariant(sibling.statusName)}>{sibling.statusName}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Start</p>
            <p>{formatUTCDate(sibling.timeOffStartDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">End</p>
            <p>{formatUTCDate(sibling.timeOffEndDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Days</p>
            <p>{sibling.timeOffDays} calendar days</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Category</p>
            <p>{sibling.categoryName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
