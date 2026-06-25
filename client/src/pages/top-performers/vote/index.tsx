import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DndContext } from '@dnd-kit/core';
import { BackToHubButton } from '@/components/BackToHubButton';
import type { DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NominationCard } from './NominationCard';
import { TopFivePanel } from './TopFivePanel';
import { useVotingState } from './useVotingState';
import { votingApi } from '@/api/topPerformers/voting';
import type { ApprovedNominationDTO } from '@/api/topPerformers/voting';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { formatUTCDate } from '@/lib/utils';

const RANK_LABELS: Record<number, string> = {
  1: '1st place',
  2: '2nd place',
  3: '3rd place',
  4: '4th place',
  5: '5th place',
};

export default function VotingPage() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: cycles } = useQuery({ queryKey: ['tp-cycles'], queryFn: cyclesApi.getAll });
  const activeCycle = cycles?.find((c) => c.cycStatus === 'VOTING_OPEN') ?? null;

  const { data: votingData } = useQuery({
    queryKey: ['tp-voting-nominations', activeCycle?.cycId],
    queryFn: () => votingApi.getNominations(activeCycle!.cycId),
    enabled: !!activeCycle?.cycId,
  });

  const nominations: ApprovedNominationDTO[] = votingData?.nominations ?? [];
  const alreadyVoted = votingData?.alreadyVoted ?? false;

  const { slots, removeFromSlot, reorder, getRank, swapIntoSlot } = useVotingState();
  const selectedCount = slots.filter((s) => s.nomId !== null).length;
  const emptySlots = slots
    .filter((s) => s.nomId === null)
    .map((s) => ({ rank: s.rank, label: RANK_LABELS[s.rank] }));

  function handleAdd(nomId: number, rank: number) {
    if (emptySlots.length === 0) {
      toast({ title: 'All 5 positions are taken. Remove one first.' });
      return;
    }
    swapIntoSlot(nomId, rank);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('card-') && overId.startsWith('slot-')) {
      const nominationId = active.data.current?.nomId as number | undefined;
      if (nominationId === undefined) return;
      const targetRank = parseInt(overId.replace('slot-', ''), 10);
      swapIntoSlot(nominationId, targetRank);
    }

    if (activeId.startsWith('slot-') && overId.startsWith('slot-')) {
      const fromRank = parseInt(activeId.replace('slot-', ''), 10);
      const toRank = parseInt(overId.replace('slot-', ''), 10);
      reorder(fromRank, toRank);
    }
  }

  async function handleVoteSubmit() {
    if (!activeCycle) return;
    setSubmitting(true);
    try {
      const items = slots.filter((s) => s.nomId !== null).map((s) => ({ nomId: s.nomId!, rank: s.rank }));
      await votingApi.submitVote(activeCycle.cycId, items);
      setSubmitted(true);
      setConfirmOpen(false);
      toast({ title: 'Your vote was registered!' });
    } catch {
      toast({ title: 'Error submitting your vote', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeCycle) {
    return <div className="p-6 text-muted-foreground">Voting is not open at this time.</div>;
  }

  if (alreadyVoted || submitted) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <BackToHubButton hubPath="/top-performers-hub" />
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-green-600">Thank you for voting!</p>
          <p className="text-muted-foreground">Your vote was registered for cycle {activeCycle.cycName}.</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-4 space-y-4">
        <BackToHubButton hubPath="/top-performers-hub" />
        <div className="rounded-md border bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-foreground">{activeCycle.cycName}</span>
          <span className="text-muted-foreground">
            Voting: {formatUTCDate(activeCycle.cycVotingStart)} – {formatUTCDate(activeCycle.cycVotingEnd)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(selectedCount / 5) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{selectedCount} of up to 5 selected</span>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto max-h-screen">
            <h2 className="font-semibold">Candidates</h2>
            {nominations.map((nom) => (
              <NominationCard
                key={nom.nomId}
                nomination={nom}
                selectedRank={getRank(nom.nomId)}
                isFull={selectedCount >= 5 && getRank(nom.nomId) === null}
                emptySlots={emptySlots}
                onAdd={(rank) => handleAdd(nom.nomId, rank)}
              />
            ))}
          </div>

          <div className="w-72 flex-shrink-0 sticky top-4 self-start">
            <TopFivePanel
              slots={slots}
              nominations={nominations}
              onRemove={removeFromSlot}
              onReorder={reorder}
            />
            <Button
              className="w-full mt-3"
              onClick={() => setConfirmOpen(true)}
            >
              Submit my vote
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm your vote</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Once submitted, your vote cannot be changed.
          </p>
          {selectedCount === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 italic">You did not vote for any nominees.</p>
          ) : (
            <ol className="text-sm space-y-1 mt-2">
              {slots.filter((s) => s.nomId !== null).map((s) => {
                const nom = nominations.find((n) => n.nomId === s.nomId);
                return (
                  <li key={s.rank}>
                    <strong>{s.rank}°</strong> — {nom?.nomAnonymizedText?.slice(0, 60)}...
                  </li>
                );
              })}
            </ol>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button onClick={handleVoteSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm vote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
