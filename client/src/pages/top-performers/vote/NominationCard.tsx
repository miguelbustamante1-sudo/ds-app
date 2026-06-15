import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ApprovedNominationDTO } from '@/api/topPerformers/voting';

const TYPE_ICONS: Record<string, string> = { ADMIN: '⭐', PEER: '👤', CUSTOMER: '❤️' };
const TYPE_LABELS: Record<string, string> = {
  ADMIN: 'Admin Nomination',
  PEER: 'Peer Nomination',
  CUSTOMER: 'Customer Nomination',
};

interface NominationCardProps {
  nomination: ApprovedNominationDTO;
  isSelected: boolean;
  isFull: boolean;
  emptySlots: Array<{ rank: number; label: string }>;
  onAdd: (rank: number) => void;
}

export function NominationCard({ nomination, isSelected, isFull, emptySlots, onAdd }: NominationCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{TYPE_ICONS[nomination.nomType] ?? '📋'}</span>
            </TooltipTrigger>
            <TooltipContent>{TYPE_LABELS[nomination.nomType] ?? 'Nomination'}</TooltipContent>
          </Tooltip>
          {nomination.nomIsVozDelCliente && (
            <Badge variant="outline" className="text-xs">✦ Voice of Customer</Badge>
          )}
          {isSelected && <Badge className="ml-auto text-xs bg-green-600">In my Top 5</Badge>}
        </div>
        <p className="text-sm line-clamp-4">{nomination.nomAnonymizedText}</p>
        {!isSelected && !isFull && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                + Agrega a mi top 5
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start" onPointerDown={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Select a position</p>
              <div className="flex flex-col gap-1">
                {emptySlots.map((slot) => (
                  <Button
                    key={slot.rank}
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      onAdd(slot.rank);
                      setPopoverOpen(false);
                    }}
                  >
                    {slot.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </CardContent>
    </Card>
  );
}
