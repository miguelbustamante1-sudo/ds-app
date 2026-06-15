import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TopFiveSlot } from './useVotingState';
import type { ApprovedNominationDTO } from '@/api/topPerformers/voting';

const RANK_LABELS: Record<number, string> = {
  1: '1st place',
  2: '2nd place',
  3: '3rd place',
  4: '4th place',
  5: '5th place',
};

interface SlotProps {
  slot: TopFiveSlot;
  nomination: ApprovedNominationDTO | undefined;
  onRemove: () => void;
}

function SortableSlot({ slot, nomination, onRemove }: SlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: `slot-${slot.rank}` });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border-2 rounded-lg p-3 min-h-16 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : slot.nomId ? 'border-green-400 bg-green-50' : 'border-dashed border-muted-foreground/30'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-muted-foreground">{RANK_LABELS[slot.rank]}</span>
          <span className="ml-2 text-xs text-muted-foreground">({slot.points} pts)</span>
        </div>
        {nomination && (
          <button
            onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-destructive hover:underline ml-2"
          >✕</button>
        )}
      </div>
      {nomination ? (
        <p className="text-xs mt-1 line-clamp-2">{nomination.nomAnonymizedText}</p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">Drag here or click + Add</p>
      )}
    </div>
  );
}

interface TopFivePanelProps {
  slots: TopFiveSlot[];
  nominations: ApprovedNominationDTO[];
  isComplete: boolean;
  onRemove: (rank: number) => void;
  onReorder: (fromRank: number, toRank: number) => void;
}

export function TopFivePanel({ slots, nominations, isComplete, onRemove }: TopFivePanelProps) {
  const nominationById = Object.fromEntries(nominations.map((n) => [n.nomId, n]));

  return (
    <div className={`p-4 rounded-xl border-2 transition-colors ${isComplete ? 'border-green-500 bg-green-50/50' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">My Top 5</h3>
        {isComplete && <span className="text-green-600 text-sm font-medium">✓ Ready to submit</span>}
      </div>
      <SortableContext items={slots.map((s) => `slot-${s.rank}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {slots.map((slot) => (
            <SortableSlot
              key={slot.rank}
              slot={slot}
              nomination={slot.nomId !== null ? nominationById[slot.nomId] : undefined}
              onRemove={() => onRemove(slot.rank)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
