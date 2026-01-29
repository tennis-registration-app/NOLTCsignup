import React from 'react';

/**
 * SilentAssignRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Verbatim JSX. No behavior change.
 */
export function SilentAssignRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
        <p className="text-xl font-medium">Assigning court...</p>
      </div>
    </div>
  );
}
