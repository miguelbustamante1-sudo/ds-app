import { UserRoundPlus } from 'lucide-react';

interface ItemBenchMoveProps {
  teamMemberName: string;
  functionalArea?: string;
  startDate?: string;
  badgeColor?: string;
  timeDisplay?: string;
  actionType?: string;
}

export default function ItemBenchMove({
  teamMemberName,
  functionalArea,
  startDate,
  timeDisplay,
}: ItemBenchMoveProps) {
  return (
    <div className="flex items-start grow gap-2.5 px-5 py-3.5">
      <div className="flex items-center justify-center size-8 bg-yellow-500/10 rounded-full border border-yellow-500/20 shrink-0 mt-0.5">
        <UserRoundPlus className="size-4 text-yellow-600" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-secondary-foreground">
          <span className="font-semibold text-mono">{teamMemberName}</span> ha sido asignado a bench bajo tu supervisión.
        </span>
        {(functionalArea || startDate) && (
          <span className="text-xs text-muted-foreground">
            {functionalArea}
            {functionalArea && startDate && <> &middot; </>}
            {startDate && <>Inicio: {startDate}</>}
          </span>
        )}
        {timeDisplay && (
          <span className="text-xs font-medium text-muted-foreground">
            {timeDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
