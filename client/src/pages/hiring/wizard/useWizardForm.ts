import { useForm } from 'react-hook-form';
import type { WizardFormData } from './types';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Single react-hook-form instance shared by Step 1 (Candidate Entry) and
 * Step 2 (Role & Rate) so values persist when navigating between them
 * before the endorsement is submitted.
 */
export function useWizardForm() {
  return useForm<WizardFormData>({
    defaultValues: {
      candidateFirstName: '',
      candidateLastName: '',
      clientId: '',
      posId: '',
      projectId: '',
      clientManagerEmail: '',
      tibId: '',
      billingRate: '',
      billingRateCurrency: '',
      countryId: '',
      startDate: today(),
      sklId: '',
      grpId: '',
      tecId: '',
      comment: '',
    },
  });
}
