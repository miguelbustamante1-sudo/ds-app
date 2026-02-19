import { useState, useCallback, useRef } from 'react';
import type { BonusCategoryDTO, EndorsementWithDetailsDTO, HiringDTO, CreateHiringDTO, UpdateHiringDTO } from '@shared/dto';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';

export function useHiringDetail(
  mode: 'draft' | 'execute',
  id?: number,
  endorsementId?: number,
) {
  const [endorsement, setEndorsement] = useState<EndorsementWithDetailsDTO | null>(null);
  const [hiring, setHiring] = useState<HiringDTO | null>(null);
  const [bonusCategories, setBonusCategories] = useState<BonusCategoryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [billableDate, setBillableDate] = useState('');
  const [workdayId, setWorkdayId] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');

  const billableDateManuallySet = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [categoriesData] = await Promise.all([
        apiGet<BonusCategoryDTO[]>('/api/bonus-categories'),
      ]);
      setBonusCategories(categoriesData);

      if (mode === 'draft' && endorsementId != null) {
        const data = await apiGet<EndorsementWithDetailsDTO>(`/api/endorsements/${endorsementId}`);
        setEndorsement(data);
        // Form fields start empty in draft mode, except currency symbol which comes from the endorsement's country
        setStartDate('');
        setBillableDate('');
        setWorkdayId('');
        setCurrencySymbol(data.country.countryCurrencySymbol ?? '');
        billableDateManuallySet.current = false;
      } else if (mode === 'execute' && id != null) {
        const data = await apiGet<HiringDTO>(`/api/hiring/${id}`);
        setHiring(data);
        setEndorsement(data.endorsement);
        // Pre-populate form fields from the hiring record
        setStartDate(data.startDate ?? '');
        setBillableDate(data.billableDate ?? '');
        setWorkdayId(data.workdayId ?? '');
        setCurrencySymbol(data.currencySymbol ?? data.endorsement.country.countryCurrencySymbol ?? '');
        billableDateManuallySet.current = false;
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load hiring detail';
      console.error(message);
    } finally {
      setLoading(false);
    }
  }, [mode, id, endorsementId]);

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (!billableDateManuallySet.current) {
      setBillableDate(value);
    }
  }

  function handleBillableDateChange(value: string) {
    billableDateManuallySet.current = true;
    setBillableDate(value);
  }

  const submitDraft = useCallback(async (): Promise<boolean> => {
    if (endorsementId == null) return false;
    try {
      setSubmitting(true);
      await apiPost<HiringDTO, CreateHiringDTO>('/api/hiring', {
        endorsementId,
        startDate,
        billableDate,
        workdayId: workdayId.trim() || null,
        currencySymbol: currencySymbol.trim() || null,
      });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create hiring';
      console.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [endorsementId, startDate, billableDate, workdayId, currencySymbol]);

  const submitExecute = useCallback(async (): Promise<boolean> => {
    if (id == null) return false;
    try {
      setSubmitting(true);
      await apiPatch<HiringDTO, UpdateHiringDTO>(`/api/hiring/${id}/execute`, {
        startDate,
        billableDate,
        workdayId: workdayId.trim() || null,
        currencySymbol: currencySymbol.trim() || null,
      });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to execute hiring';
      console.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [id, startDate, billableDate, workdayId, currencySymbol]);

  const canExecute = workdayId.trim().length > 0;

  return {
    endorsement,
    hiring,
    bonusCategories,
    loading,
    submitting,
    startDate,
    billableDate,
    workdayId,
    currencySymbol,
    canExecute,
    load,
    handleStartDateChange,
    handleBillableDateChange,
    setWorkdayId,
    setCurrencySymbol,
    submitDraft,
    submitExecute,
  };
}
