import React from 'react';

export function AnalyticsSection({ services, AnalyticsDashboard }) {
  return <AnalyticsDashboard onClose={null} backend={services.backend} />;
}
