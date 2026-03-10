import { useState, useEffect, useCallback, useRef } from 'react';

// ================================================================
// useApi - generic async data fetching hook
// ================================================================
export const useApi = (apiFunc, deps = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      if (isMounted.current) {
        setData(result.data?.data || result.data);
      }
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err.response?.data?.message || err.message || 'An error occurred');
      }
      throw err;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    if (immediate) execute();
  }, deps); // eslint-disable-line

  return { data, loading, error, execute, setData };
};

// ================================================================
// useDebounce - debounce value changes
// ================================================================
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// ================================================================
// useLocalStorage - synced localStorage state
// ================================================================
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};
