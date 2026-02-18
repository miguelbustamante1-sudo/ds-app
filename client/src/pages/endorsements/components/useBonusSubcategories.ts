import { useState, useCallback, useEffect } from 'react';
import type { BonusSubcategoryDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

export function useBonusSubcategories(countryId: number | null) {
  const [subcategories, setSubcategories] = useState<BonusSubcategoryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubcategories = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const data = await apiGet<BonusSubcategoryDTO[]>(
        `/api/bonus-subcategories?countryId=${id}`,
      );
      setSubcategories(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load bonus subcategories';
      console.error(message);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (countryId == null) {
      setSubcategories([]);
      return;
    }
    loadSubcategories(countryId);
  }, [countryId, loadSubcategories]);

  return { subcategories, loading };
}
