/**
 * Generic hook for managing entity lists with CRUD operations
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../lib/api';

export interface UseEntityListOptions<TEntity, TCreateDTO, TUpdateDTO> {
  endpoint: string;
  idKey: keyof TEntity;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export interface UseEntityListReturn<TEntity, TCreateDTO, TUpdateDTO> {
  items: TEntity[];
  loading: boolean;
  error: string | null;
  loadItems: () => Promise<void>;
  createItem: (data: TCreateDTO) => Promise<TEntity>;
  updateItem: (id: number, data: TUpdateDTO) => Promise<TEntity>;
  deleteItem: (id: number) => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<TEntity[]>>;
}

/**
 * Generic hook for managing a list of entities with CRUD operations
 *
 * @example
 * const countries = useEntityList<CountryDTO, CreateCountryDTO, UpdateCountryDTO>({
 *   endpoint: '/api/countries',
 *   idKey: 'countryId',
 *   onSuccess: (msg) => toast({ title: 'Success', description: msg }),
 *   onError: (err) => toast({ title: 'Error', description: err, variant: 'destructive' })
 * });
 */
export function useEntityList<TEntity, TCreateDTO, TUpdateDTO>({
  endpoint,
  idKey,
  onSuccess,
  onError,
}: UseEntityListOptions<TEntity, TCreateDTO, TUpdateDTO>): UseEntityListReturn<TEntity, TCreateDTO, TUpdateDTO> {
  const [items, setItems] = useState<TEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<TEntity[]>(endpoint);
      setItems(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load items';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, onError]);

  const createItem = useCallback(async (data: TCreateDTO): Promise<TEntity> => {
    try {
      const created = await apiPost<TEntity, TCreateDTO>(endpoint, data);
      setItems(prev => [...prev, created]);
      onSuccess?.('Item created successfully');
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create item';
      onError?.(message);
      throw err;
    }
  }, [endpoint, onSuccess, onError]);

  const updateItem = useCallback(async (id: number, data: TUpdateDTO): Promise<TEntity> => {
    try {
      const updated = await apiPut<TEntity, TUpdateDTO>(`${endpoint}/${id}`, data);
      setItems(prev => prev.map(item => (item as any)[idKey] === id ? updated : item));
      onSuccess?.('Item updated successfully');
      return updated;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update item';
      onError?.(message);
      throw err;
    }
  }, [endpoint, idKey, onSuccess, onError]);

  const deleteItem = useCallback(async (id: number): Promise<void> => {
    try {
      await apiDelete(`${endpoint}/${id}`);
      setItems(prev => prev.filter(item => (item as any)[idKey] !== id));
      onSuccess?.('Item deleted successfully');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete item';
      onError?.(message);
      throw err;
    }
  }, [endpoint, idKey, onSuccess, onError]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    setItems,
  };
}
