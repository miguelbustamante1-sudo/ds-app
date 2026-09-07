import { useEffect, useState } from 'react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { HolidaySwapTable } from './components/HolidaySwapTable';
import { RequestSwapDialog } from './components/RequestSwapDialog';
import { CancelSwapDialog } from './components/CancelSwapDialog';
import { useMySwaps } from './hooks/useMySwaps';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

export function HolidaySwapsPage() {
  const { toast } = useToast();
  const { swaps, loading, loadSwaps } = useMySwaps();

  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<HolidaySwapDTO | null>(null);

  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  function handleRequestSuccess(swap: HolidaySwapDTO) {
    toast({ title: 'Swap submitted', description: `Your holiday swap request for ${swap.holidayName} has been submitted.` });
    loadSwaps();
  }

  function handleCancelSuccess(swap: HolidaySwapDTO) {
    toast({ title: 'Swap cancelled', description: `Your holiday swap for ${swap.holidayName} has been cancelled.` });
    loadSwaps();
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Holiday Swaps</ToolbarPageTitle>
          <ToolbarDescription>
            Request to work on a public holiday in exchange for a personal day off.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button onClick={() => setRequestOpen(true)}>Request Swap</Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6">
        <HolidaySwapTable
          swaps={swaps}
          loading={loading}
          onCancel={(swap) => setCancelTarget(swap)}
        />
      </div>

      <RequestSwapDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSuccess={handleRequestSuccess}
      />

      <CancelSwapDialog
        swap={cancelTarget}
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onSuccess={handleCancelSuccess}
      />
    </div>
  );
}
