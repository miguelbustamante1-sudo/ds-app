import { Badge } from '@/components/ui/badge';
import type { PerformanceCasePhaseName } from '@shared/dto';

export const PHASE_LABELS: Record<PerformanceCasePhaseName, string> = {
  PHASE_0: 'Intake',
  PHASE_1: 'Feedback Meeting',
  PHASE_2: 'RCA',
  PHASE_3: 'Plan + Commitment',
  PHASE_4: 'TM Meeting',
  PHASE_5: 'Execution',
  PHASE_6: 'Closure Review',
  POST_CLOSURE: 'Post-Closure',
};
const PHASE_ORDER = Object.keys(PHASE_LABELS) as PerformanceCasePhaseName[];

interface PhaseStepperProps {
  currentPhase: PerformanceCasePhaseName;
  selectedPhase: PerformanceCasePhaseName;
  onSelect: (phase: PerformanceCasePhaseName) => void;
}

export function PhaseStepper({ currentPhase, selectedPhase, onSelect }: PhaseStepperProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  return (
    <div className="flex flex-wrap gap-2">
      {PHASE_ORDER.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isSelectable = isCompleted || isCurrent;
        const isSelected = phase === selectedPhase;
        return (
          <button
            key={phase}
            type="button"
            disabled={!isSelectable}
            onClick={() => onSelect(phase)}
            aria-pressed={isSelected}
            className={isSelectable ? 'cursor-pointer' : 'cursor-default'}
          >
            <Badge
              variant={isCompleted ? 'primary' : isCurrent ? 'warning' : 'outline'}
              appearance={isCurrent || isSelected ? undefined : 'light'}
              className={isSelected ? 'ring-2 ring-primary ring-offset-1' : undefined}
            >
              {PHASE_LABELS[phase]}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
