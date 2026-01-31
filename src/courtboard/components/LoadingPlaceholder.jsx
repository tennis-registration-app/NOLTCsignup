import React from 'react';

/**
 * LoadingPlaceholder - Loading screen while Tennis modules initialize
 */
export function LoadingPlaceholder() {
  return (
    <div className="h-screen min-h-screen bg-gradient-to-br from-slate-700 to-slate-600 p-4 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎾</div>
        <div className="text-xl">Loading Court Display...</div>
        <div className="text-sm text-gray-400 mt-2">Waiting for Tennis modules</div>
      </div>
    </div>
  );
}
