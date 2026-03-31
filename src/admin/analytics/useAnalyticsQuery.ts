import { useState, useEffect, useRef, useCallback } from 'react';

interface DateRange {
  start: Date | string;
  end: Date | string;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Hook for fetching analytics data with date range
 */
const useAnalyticsQuery = (getAnalyticsFn: (params: { start: string; end: string }) => Promise<ApiResponse>, dateRange: DateRange | null | undefined) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!dateRange?.start || !dateRange?.end) return;

    const currentRequest = ++requestId.current;
    setLoading(true);
    // Keep previous data while loading - do not flash empty

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
      setError(err instanceof Error ? err.message : String(err));
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
