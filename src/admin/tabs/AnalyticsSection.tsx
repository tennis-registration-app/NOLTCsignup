import React from 'react';

export function AnalyticsSection({ services, AnalyticsDashboard }: { services: { backend?: unknown }; AnalyticsDashboard: (props: { onClose?: (() => void) | null; backend?: unknown }) => React.ReactElement | null }) {
  return <AnalyticsDashboard onClose={null} backend={services.backend} />;
}
