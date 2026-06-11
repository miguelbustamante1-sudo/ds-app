import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DndContext } from '@dnd-kit/core';
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

export default function VotingPage() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: votingData } = useQuery({
    queryKey: ['tp-voting-nominations', activeCycle?.cycId],
    queryFn: () => votingApi.getNominations(activeCycle!.cycId),
    enabled: !!activeCycle?.cycId,
  });

  const nominations: ApprovedNominationDTO[] = votingData?.nominations ?? [];
  const alreadyVoted = votingData?.alreadyVoted ?? false;

  const { slots, isComplete, addToNextEmpty, removeFromSlot, reorder, isSelected } = useVotingState();
  const selectedCount = slots.filter((s) => s.nomId !== null).length;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('card-') && overId.startsWith('slot-')) {
      const nominationId = active.data.current?.nomId as number | undefined;
      if (nominationId !== undefined) addToNextEmpty(nominationId);
    }

    if (activeId.startsWith('slot-') && overId.startsWith('slot-')) {
      const fromRank = parseInt(activeId.replace('slot-', ''), 10);
      const toRank = parseInt(overId.replace('slot-', ''), 10);
      reorder(fromRank, toRank);
    }
  }

  async function handleSubmit() {
    if (!activeCycle || !isComplete) return;
    setSubmitting(true);
    try {
      const items = slots.map((s) => ({ nomId: s.nomId!, rank: s.rank }));
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

  if (!activeCycle || activeCycle.cycStatus !== 'VOTING_OPEN') {
    return <div className="p-6 text-muted-foreground">Voting is not open at this time.</div>;
  }

  if (alreadyVoted || submitted) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-2xl font-bold text-green-600">Thank you for voting!</p>
        <p className="text-muted-foreground">Your vote was registered for cycle {activeCycle.cycName}.</p>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(selectedCount / 5) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{selectedCount} of 5 selected</span>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto max-h-screen">
            <h2 className="font-semibold">Candidates</h2>
            {nominations.map((nom) => (
              <NominationCard
                key={nom.nomId}
                nomination={nom}
                isSelected={isSelected(nom.nomId)}
                isFull={selectedCount >= 5 && !isSelected(nom.nomId)}
                onAdd={() => addToNextEmpty(nom.nomId)}
              />
            ))}
          </div>

          <div className="w-72 flex-shrink-0 sticky top-4 self-start">
            <TopFivePanel
              slots={slots}
              nominations={nominations}
              isComplete={isComplete}
              onRemove={removeFromSlot}
              onReorder={reorder}
            />
            <Button
              className="w-full mt-3"
              disabled={!isComplete}
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
          <ol className="text-sm space-y-1 mt-2">
            {slots.map((s) => {
              const nom = nominations.find((n) => n.nomId === s.nomId);
              return (
                <li key={s.rank}>
                  <strong>{s.rank}°</strong> — {nom?.nomAnonymizedText?.slice(0, 60)}...
                </li>
              );
            })}
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm vote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
