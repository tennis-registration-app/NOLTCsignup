import React from 'react';

export function HistorySection({ services, GameHistorySearch }: { services: { backend?: unknown }; GameHistorySearch: (props: { backend?: unknown }) => React.ReactElement | null }) {
  return <GameHistorySearch backend={services.backend} />;
}
