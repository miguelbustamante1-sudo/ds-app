import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TopFiveSlot } from './useVotingState';
import type { ApprovedNominationDTO } from '@/api/topPerformers/voting';

const RANK_LABELS: Record<number, string> = {
  1: '1er lugar',
  2: '2do lugar',
  3: '3er lugar',
  4: '4to lugar',
  5: '5to lugar',
};

interface SlotProps {
  slot: TopFiveSlot;
  nomination: ApprovedNominationDTO | undefined;
  onRemove: () => void;
}

function SortableSlot({ slot, nomination, onRemove }: SlotProps) {
  const { attributes, listeners, setNodeRef: sortableRef, transform, transition } = useSortable({ id: `slot-${slot.rank}` });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `slot-${slot.rank}` });

  const style = { transform: CSS.Transform.toString(transform), transition };

  function mergeRef(node: HTMLDivElement | null) {
    sortableRef(node);
    dropRef(node);
  }

  return (
    <div
      ref={mergeRef}
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
          <button onClick={onRemove} className="text-xs text-destructive hover:underline ml-2">✕</button>
        )}
      </div>
      {nomination ? (
        <p className="text-xs mt-1 line-clamp-2">{nomination.nomAnonymizedText}</p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">Arrastra aquí o haz clic en + Agregar</p>
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
        <h3 className="font-semibold text-sm">Mi Top 5</h3>
        {isComplete && <span className="text-green-600 text-sm font-medium">✓ Listo para enviar</span>}
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
