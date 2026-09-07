import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { TpNominationAdminDTO } from '@/api/topPerformers/nominations';

interface NomineeDetailSheetProps {
  nomination: TpNominationAdminDTO;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  PEER: 'Peer',
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
};

export function NomineeDetailSheet({ nomination, onClose }: NomineeDetailSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{nomination.nomineeName}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Badge variant="outline">{TYPE_LABELS[nomination.nomType] ?? nomination.nomType}</Badge>
            {nomination.nomIsVozDelCliente && <Badge variant="secondary">✦ Voice of Customer</Badge>}
            <Badge variant="outline">{nomination.nomAnonymizationStatus}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                Original Text
              </p>
              <div className="bg-muted rounded p-3 whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
                {nomination.nomAchievementText}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                Anonymized Text
              </p>
              <div className="bg-muted rounded p-3 whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
                {nomination.nomAnonymizedText ?? (
                  <span className="text-muted-foreground italic">Not yet anonymized</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
