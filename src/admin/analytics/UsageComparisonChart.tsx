import React, { useMemo } from 'react';

/**
 * Bar chart showing usage (hours) or wait time (minutes) by period
 * Supports optional comparison with side-by-side bars
 */
export function UsageComparisonChart({ data, loading, error }) {
  // Calculate chart dimensions and scales
  const chartConfig = useMemo(() => {
    if (!data?.primary?.buckets?.length) return null;

    const buckets = data.primary.buckets;
    const comparisonBuckets = data.comparison?.buckets || [];
    const hasComparison = comparisonBuckets.length > 0;

    // Find max value for scale
    const allValues = [...buckets.map((b) => b.value), ...comparisonBuckets.map((b) => b.value)];
    const maxValue = Math.max(...allValues, 1); // At least 1 to avoid division by zero

    // Round up to nice number for y-axis
    const niceMax =
      data.unit === 'hours'
        ? Math.ceil(maxValue / 50) * 50 || 50
        : Math.ceil(maxValue / 5) * 5 || 5;

    return {
      buckets,
      comparisonBuckets,
      hasComparison,
      maxValue: niceMax,
      unit: data.unit,
      primaryLabel: `${data.primary.startDate.slice(0, 4)}`,
      comparisonLabel: data.comparison ? `${data.comparison.startDate.slice(0, 4)}` : null,
    };
  }, [data]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Comparison</h3>
        <div className="text-red-600 text-center py-8">
          Error loading data: {error.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // Empty state
  if (!chartConfig) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Comparison</h3>
        <p className="text-gray-500 text-center py-8">Select a date range to view data</p>
      </div>
    );
  }

  const {
    buckets,
    comparisonBuckets,
    hasComparison,
    maxValue,
    unit,
    primaryLabel,
    comparisonLabel,
  } = chartConfig;

  // Y-axis labels (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => Math.round(maxValue * (1 - pct)));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header with legend */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {unit === 'hours' ? 'Court Usage' : 'Wait Time'}
        </h3>
        {hasComparison && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
              {primaryLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
              {comparisonLabel}
            </span>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="relative h-72">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
          {yTicks.map((val, i) => (
            <span key={i} className="text-right pr-2">
              {val}
            </span>
          ))}
        </div>

        {/* Chart content */}
        <div className="ml-12 h-full pb-8 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 bottom-0 flex flex-col justify-between pointer-events-none">
            {yTicks.map((_, i) => (
              <div key={i} className="border-t border-gray-100 w-full"></div>
            ))}
          </div>

          {/* Bars container */}
          <div className="absolute inset-0 bottom-8 flex items-end">
            {buckets.map((bucket, idx) => {
              const primaryHeight = (bucket.value / maxValue) * 100;
              const comparisonValue = comparisonBuckets[idx]?.value || 0;
              const comparisonHeight = (comparisonValue / maxValue) * 100;

              // Calculate percent change for tooltip
              let percentChange = null;
              if (hasComparison && comparisonValue > 0) {
                percentChange = ((bucket.value - comparisonValue) / comparisonValue) * 100;
              }

              return (
                <div
                  key={bucket.bucketStart}
                  className="flex-1 h-full flex items-end justify-center gap-0.5 group relative px-0.5"
                >
                  {/* Comparison bar (if exists) */}
                  {hasComparison && (
                    <div
                      className="bg-amber-500 rounded-t transition-all duration-200 hover:bg-amber-400 w-4"
                      style={{
                        height: `${comparisonHeight}%`,
                        minHeight: comparisonValue > 0 ? '2px' : '0',
                      }}
                    />
                  )}

                  {/* Primary bar */}
                  <div
                    className="bg-blue-500 rounded-t transition-all duration-200 hover:bg-blue-400 w-4"
                    style={{
                      height: `${primaryHeight}%`,
                      minHeight: bucket.value > 0 ? '2px' : '0',
                    }}
                  />

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-150
                                  bg-gray-900 text-white text-xs rounded-lg px-3 py-2
                                  whitespace-nowrap z-10 pointer-events-none shadow-lg"
                  >
                    <div className="font-medium mb-1">{bucket.labelFull}</div>
                    <div className="text-blue-300">
                      {bucket.value.toFixed(1)} {unit}
                    </div>
                    {hasComparison && (
                      <>
                        <div className="text-amber-300 mt-1">
                          {comparisonBuckets[idx]?.labelFull}: {comparisonValue.toFixed(1)} {unit}
                        </div>
                        {percentChange !== null && (
                          <div
                            className={`mt-1 ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}%
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 h-8 flex overflow-hidden">
            {buckets.map((bucket) => (
              <div
                key={bucket.bucketStart}
                className="flex-1 text-center text-xs text-gray-600 truncate px-0.5 pt-2"
                title={bucket.labelFull}
              >
                {bucket.label}
              </div>
            ))}
          </div>
        </div>

        {/* Y-axis label */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500 whitespace-nowrap">
          {unit === 'hours' ? 'Hours' : 'Minutes'}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Updating...</div>
        </div>
      )}
    </div>
  );
}

export default UsageComparisonChart;
