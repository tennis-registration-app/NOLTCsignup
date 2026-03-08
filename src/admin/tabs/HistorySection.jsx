import React from 'react';

export function HistorySection({ services, GameHistorySearch }) {
  return <GameHistorySearch backend={services.backend} />;
}
