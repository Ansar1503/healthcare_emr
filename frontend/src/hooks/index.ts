import { useState, useEffect, useCallback, useRef } from 'react';
import type { AxiosResponse } from 'axios';

// ── useApi — generic typed data fetching ─────────────────────────────────────
interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: unknown[]) => Promise<AxiosResponse | void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export const useApi = <T>(
  apiFunc: (...args: unknown[]) => Promise<AxiosResponse<{ data?: T } | T>>,
  deps: unknown[] = [],
  immediate = true
): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]) => {
      if (isMounted.current) setLoading(true);
      if (isMounted.current) setError(null);
      try {
        const result = await apiFunc(...args);
        if (isMounted.current) {
          const payload = result.data;
          const inner = (payload as { data?: T }).data ?? (payload as T);
          setData(inner ?? null);
        }
        return result;
      } catch (err) {
        if (isMounted.current) {
          const msg =
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            (err as Error).message ??
            'An error occurred';
          setError(msg);
        }
        throw err;
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    if (immediate) void execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, execute, setData };
};

// ── useDebounce ───────────────────────────────────────────────────────────────
export const useDebounce = <T>(value: T, delay = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};
