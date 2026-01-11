import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for fetching analytics data with date range
 * @param {Function} getAnalyticsFn - Function that accepts { start, end } and returns analytics data
 * @param {Object} dateRange - Object with start and end Date objects
 * @returns {{ data: Object|null, loading: boolean, error: string|null, refetch: Function }}
 */
const useAnalyticsQuery = (getAnalyticsFn, dateRange) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!dateRange?.start || !dateRange?.end) return;

    const currentRequest = ++requestId.current;
    setLoading(true);
    // Keep previous data while loading - don't flash empty

    try {
      const result = await getAnalyticsFn({
        start:
          dateRange.start instanceof Date
            ? dateRange.start.toISOString().split('T')[0]
            : dateRange.start,
        end:
          dateRange.end instanceof Date ? dateRange.end.toISOString().split('T')[0] : dateRange.end,
      });

      // Ignore stale responses
      if (currentRequest !== requestId.current) return;

      if (result.ok) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(err.message);
    }

    // Only update loading if this is still the current request
    if (currentRequest === requestId.current) {
      setLoading(false);
    }
  }, [getAnalyticsFn, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export default useAnalyticsQuery;
