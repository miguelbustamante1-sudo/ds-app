import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApprovedNominationDTO } from '@/api/topPerformers/voting';

const TYPE_ICONS: Record<string, string> = { ADMIN: '⭐', PEER: '👤', CUSTOMER: '❤️' };

interface NominationCardProps {
  nomination: ApprovedNominationDTO;
  isSelected: boolean;
  isFull: boolean;
  onAdd: () => void;
}

export function NominationCard({ nomination, isSelected, isFull, onAdd }: NominationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${nomination.nomId}`,
    data: { nomId: nomination.nomId },
    disabled: isSelected || isFull,
  });

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab transition-all ${
        isSelected ? 'border-green-500 shadow-md' : isFull ? 'opacity-40' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <span>{TYPE_ICONS[nomination.nomType] ?? '📋'}</span>
          {nomination.nomIsVozDelCliente && (
            <Badge variant="outline" className="text-xs">✦ Voz del Cliente</Badge>
          )}
          {isSelected && <Badge className="ml-auto text-xs bg-green-600">En mi Top 5</Badge>}
        </div>
        <p className="text-sm line-clamp-4">{nomination.nomAnonymizedText}</p>
        {!isSelected && !isFull && (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onAdd(); }}>
            + Agregar a mi Top 5
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
