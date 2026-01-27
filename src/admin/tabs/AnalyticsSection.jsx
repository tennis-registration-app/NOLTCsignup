import React from 'react';

export function AnalyticsSection({ backend, AnalyticsDashboard }) {
  return typeof AnalyticsDashboard !== 'undefined' ? (
    <AnalyticsDashboard onClose={null} backend={backend} />
  ) : (
    <div className="p-8 text-center">
      <h3 className="text-lg font-semibold text-gray-600">Analytics Dashboard</h3>
      <p className="text-gray-500 mt-2">Analytics component not available</p>
    </div>
  );
}
