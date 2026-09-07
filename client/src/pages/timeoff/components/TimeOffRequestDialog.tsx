import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import { TimeOffRequestForm } from './TimeOffRequestForm';

type WorkdayBalance = { vacation: number; rawVacation: number; personalDays: number; personalDaysUsedThisMonth: number } | null;

interface TimeOffRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  workdayBalance: WorkdayBalance;
  onSuccess: () => void;
}

export function TimeOffRequestDialog({
  open,
  onOpenChange,
  existingTimeOffs,
  workdayBalance,
  onSuccess,
}: TimeOffRequestDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        {/* HolidayProvider is already provided by the parent MyTimeOffPage */}
        <TimeOffRequestForm
          existingTimeOffs={existingTimeOffs}
          onSuccess={handleSuccess}
          workdayBalance={workdayBalance}
        />
      </DialogContent>
    </Dialog>
  );
}
