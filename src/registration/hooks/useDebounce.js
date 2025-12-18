/**
 * useDebounce Hook
 *
 * Custom React hook for debouncing values.
 * Useful for delaying expensive operations like API calls
 * until user stops typing.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - The debounced value
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300);
 *   useEffect(() => {
 *     // This runs only after user stops typing for 300ms
 *     searchAPI(debouncedSearch);
 *   }, [debouncedSearch]);
 */
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
