import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { resultsApi } from '@/api/topPerformers/results';
import type { LeaderboardEntry } from '@/api/topPerformers/results';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TYPE_LABELS: Record<string, string> = { PEER: 'Peer', ADMIN: 'Administrative', CUSTOMER: 'Customer' };

interface CandidateDetailPanelProps {
  cycId: number;
  entry: LeaderboardEntry;
  onClose: () => void;
}

export function CandidateDetailPanel({ cycId, entry, onClose }: CandidateDetailPanelProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['tp-candidate', cycId, entry.nomineeId],
    queryFn: () => resultsApi.getCandidateDetail(cycId, entry.nomineeId),
  });

  const rankChartData = detail
    ? [1, 2, 3, 4, 5].map((rank) => ({ rank: `${rank}°`, votes: detail.rankDistribution[rank] ?? 0 }))
    : [];

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{entry.nomineeNames} {entry.nomineeSurnames}</SheetTitle>
        </SheetHeader>

        {isLoading && <p className="text-muted-foreground mt-4">Loading...</p>}

        {detail && (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{entry.totalWeightedPoints}</p>
                <p className="text-xs text-muted-foreground">Weighted Points</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{entry.totalVotesReceived}</p>
                <p className="text-xs text-muted-foreground">Votes</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{entry.totalNominationsReceived}</p>
                <p className="text-xs text-muted-foreground">Nominations</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Vote distribution by rank</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={rankChartData}>
                  <XAxis dataKey="rank" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Full nominations</p>
              {detail.nominations.map((nom) => (
                <div key={nom.nomId} className="border rounded p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{TYPE_LABELS[nom.nomType] ?? nom.nomType}</Badge>
                    {nom.nomIsVozDelCliente && <Badge variant="secondary">✦ Voice of Customer</Badge>}
                    {nom.nomAdminConfidenceLevel !== null && (
                      <Badge variant="outline">Confidence: {nom.nomAdminConfidenceLevel}/5</Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{nom.nomAchievementText}</p>
                  {nom.nomAdminExceedsRole && (
                    <div><strong>Exceeds expectations:</strong> {nom.nomAdminExceedsRole}</div>
                  )}
                  {nom.nomAdminClientImpact && (
                    <div><strong>Impact:</strong> {nom.nomAdminClientImpact}</div>
                  )}
                  {nom.metrics.length > 0 && (
                    <table className="text-xs w-full mt-1">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left">Metric</th>
                          <th>Value</th>
                          <th>Goal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nom.metrics.map((m, i) => (
                          <tr key={i}>
                            <td>{m.nmeMetricName}</td>
                            <td className="text-center">{m.nmeMetricValue}</td>
                            <td className="text-center">{m.nmeMetricBenchmark ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
