import { Badge } from '@/components/ui/badge';
import type { PerformanceCasePhaseName } from '@shared/dto';

const PHASE_LABELS: Record<PerformanceCasePhaseName, string> = {
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

export function PhaseStepper({ currentPhase }: { currentPhase: PerformanceCasePhaseName }) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  return (
    <div className="flex flex-wrap gap-2">
      {PHASE_ORDER.map((phase, index) => (
        <Badge
          key={phase}
          variant={index < currentIndex ? 'primary' : index === currentIndex ? 'warning' : 'outline'}
          appearance={index === currentIndex ? undefined : 'light'}
        >
          {PHASE_LABELS[phase]}
        </Badge>
      ))}
    </div>
  );
}
