import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import { TimeOffRequestForm } from './TimeOffRequestForm';

interface TimeOffRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTimeOffs: TimeOffWithDetailsDTO[];
  onSuccess: () => void;
}

export function TimeOffRequestDialog({
  open,
  onOpenChange,
  existingTimeOffs,
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
        />
      </DialogContent>
    </Dialog>
  );
}
