import { useState, useEffect, useRef, useCallback } from 'react';
import backend from '../../registration/backend';

/**
 * Hook for fetching usage comparison data
 * Follows same patterns as useAnalyticsQuery (stale request handling, etc.)
 */
export function useUsageComparisonQuery({
  metric = 'usage',
  primaryStart,
  primaryEnd,
  granularity = 'auto',
  comparisonStart = null,
  enabled = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  // Format date to ISO string (YYYY-MM-DD)
  const formatDate = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  };

  const fetchData = useCallback(async () => {
    if (!enabled || !primaryStart || !primaryEnd) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await backend().admin.getUsageComparison({
        metric,
        primaryStart: formatDate(primaryStart),
        primaryEnd: formatDate(primaryEnd),
        granularity,
        comparisonStart: formatDate(comparisonStart),
      });

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      setData(result);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      console.error('Usage comparison fetch error:', err);
      setError(err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [metric, primaryStart, primaryEnd, granularity, comparisonStart, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    effectiveGranularity: data?.granularity || null,
  };
}

export default useUsageComparisonQuery;
