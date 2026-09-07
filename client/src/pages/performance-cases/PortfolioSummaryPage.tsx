import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle } from '@/components/ui/toolbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackToHubButton } from '@/components/BackToHubButton';
import { getPortfolioSummary } from '@/api/performanceCases';
import type { PortfolioSummary } from '@/api/performanceCases';

export function PortfolioSummaryPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    getPortfolioSummary().then(setSummary);
  }, []);

  if (!summary) return null;

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Performance Portfolio Summary</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/performance-management-hub" />
        </ToolbarActions>
      </Toolbar>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <CardTitle>Cases by Severity Tier</CardTitle>
            <ul className="mt-2 space-y-1">
              {Object.entries(summary.countByTier).map(([tier, count]) => (
                <li key={tier}>{tier}: {count}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle>Cases by Phase</CardTitle>
            <ul className="mt-2 space-y-1">
              {Object.entries(summary.countByPhase).map(([phase, count]) => (
                <li key={phase}>{phase}: {count}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle>At-Risk Cases ({summary.atRiskCases.length})</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.atRiskCases.map((c) => (
                <Button key={c.caseId} variant="outline" size="sm" onClick={() => navigate(`/performance-cases/${c.caseId}`)}>
                  {c.caseCode}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle>TL Strike Counts</CardTitle>
            <ul className="mt-2 space-y-1">
              {summary.tlStrikeCounts.map((tl) => (
                <li key={tl.teamLeaderId}>{tl.teamLeaderName}: {tl.strikeCount}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
