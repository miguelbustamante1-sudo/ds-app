/**
 * Generic hook for entity form handling
 */

import { useState } from 'react';
import { ApiError } from '../lib/api';

export interface UseEntityFormOptions<TEntity, TFormData> {
  onSubmit: (data: TFormData) => Promise<TEntity>;
  onSuccess?: (entity: TEntity) => void;
  onError?: (error: string) => void;
}

export interface UseEntityFormReturn {
  submitting: boolean;
  submit: (data: any) => Promise<void>;
}

/**
 * Generic hook for handling form submission with loading and error states
 *
 * @example
 * const form = useEntityForm({
 *   onSubmit: async (data) => await countries.createItem(data),
 *   onSuccess: (entity) => { setOpen(false); countries.loadItems(); },
 *   onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' })
 * });
 */
export function useEntityForm<TEntity, TFormData>({
  onSubmit,
  onSuccess,
  onError,
}: UseEntityFormOptions<TEntity, TFormData>): UseEntityFormReturn {
  const [submitting, setSubmitting] = useState(false);

  const submit = async (data: TFormData) => {
    try {
      setSubmitting(true);
      const result = await onSubmit(data);
      onSuccess?.(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit form';
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    submit,
  };
}
