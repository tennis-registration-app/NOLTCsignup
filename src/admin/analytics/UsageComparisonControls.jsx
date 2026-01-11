import React from 'react';

/**
 * Controls for the usage comparison chart
 * - Metric selector (usage only for Phase 1)
 * - Primary date range
 * - Granularity selector with auto option
 * - Optional comparison date
 */
export function UsageComparisonControls({
  metric,
  onMetricChange,
  primaryStart,
  primaryEnd,
  onPrimaryStartChange,
  onPrimaryEndChange,
  granularity,
  onGranularityChange,
  comparisonEnabled,
  onComparisonEnabledChange,
  comparisonStart,
  onComparisonStartChange,
  effectiveGranularity,
  comparisonEnd, // Auto-calculated, display only
}) {
  // Format date for input value
  const formatForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  };

  // Check if comparison end is in the future
  const today = new Date().toISOString().split('T')[0];
  const isComparisonPartial = comparisonEnd && comparisonEnd > today;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* Row 1: Metric and Primary Date Range */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Metric:</label>
          <select
            value={metric}
            onChange={(e) => onMetricChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="usage">Court Usage</option>
            <option value="waittime" disabled>
              Wait Time (coming soon)
            </option>
          </select>
        </div>

        {/* Primary Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <input
            type="date"
            value={formatForInput(primaryStart)}
            onChange={(e) => onPrimaryStartChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={formatForInput(primaryEnd)}
            onChange={(e) => onPrimaryEndChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Granularity Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Granularity:</label>
          <select
            value={granularity}
            onChange={(e) => onGranularityChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="auto">Auto</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          {granularity === 'auto' && effectiveGranularity && (
            <span className="text-xs text-gray-500">(showing: {effectiveGranularity})</span>
          )}
        </div>
      </div>

      {/* Row 2: Comparison Toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={comparisonEnabled}
            onChange={(e) => onComparisonEnabledChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Compare to:</span>
        </label>

        {comparisonEnabled && (
          <>
            <input
              type="date"
              value={formatForInput(comparisonStart)}
              onChange={(e) => onComparisonStartChange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-500">→</span>
            <span className="text-sm text-gray-600">{comparisonEnd || '...'}</span>
            {isComparisonPartial && (
              <span className="text-xs text-amber-600 font-medium">(partial data)</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UsageComparisonControls;
