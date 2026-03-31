import { useState, useEffect, useRef, useCallback } from 'react';
import backend from '../../lib/backend';

interface UsageComparisonParams {
  metric?: string;
  primaryStart?: Date | string | null;
  primaryEnd?: Date | string | null;
  granularity?: string;
  comparisonStart?: Date | string | null;
  enabled?: boolean;
}

interface ComparisonBuckets {
  startDate: string;
  buckets: Array<{ value: number; bucketStart: string; label: string; labelFull: string }>;
}

interface UsageComparisonData {
  granularity: string;
  unit: string;
  primary: ComparisonBuckets;
  comparison?: ComparisonBuckets;
}

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
}: UsageComparisonParams) {
  const [data, setData] = useState<UsageComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestIdRef = useRef(0);

  // Format date to ISO string (YYYY-MM-DD)
  const formatDate = (date: Date | string | null | undefined): string | null => {
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
        primaryStart: formatDate(primaryStart) as string,
        primaryEnd: formatDate(primaryEnd) as string,
        granularity,
        comparisonStart: formatDate(comparisonStart),
      });

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      setData(result as unknown as UsageComparisonData);
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
