import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiGet } from '@/lib/api';
import { HolidayProvider } from '../context/HolidayContext';
import { EditTimeOffPageInner } from './index';

interface MyTeamMemberProfile {
  teamMemberId: number;
  teamMemberStartDate: string | null;
  teamMemberEndDate: string | null;
  countryId: number | null;
  countryIso: string | null;
  hireDate: string | null;
}

interface EditTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOffId: number | null;
  onSuccess: () => void;
}

export function EditTimeOffDialog({
  open,
  onOpenChange,
  timeOffId,
  onSuccess,
}: EditTimeOffDialogProps) {
  const [countryId, setCountryId] = useState<number | null>(null);
  const [countryIso, setCountryIso] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyTeamMemberProfile | null>(null);

  useEffect(() => {
    if (!open) return;
    apiGet<MyTeamMemberProfile>('/api/team-members/me')
      .then((p) => {
        setProfile(p);
        setCountryId(p.countryId);
        setCountryIso(p.countryIso);
      })
      .catch(() => {});
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Time Off</DialogTitle>
        </DialogHeader>
        <HolidayProvider countryId={countryId} countryIso={countryIso}>
          <EditTimeOffPageInner
            timeOffId={timeOffId}
            profile={profile}
            isModal
            onClose={handleClose}
          />
        </HolidayProvider>
      </DialogContent>
    </Dialog>
  );
}
