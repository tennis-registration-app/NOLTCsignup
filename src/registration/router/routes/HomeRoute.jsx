// @ts-check
import React from 'react';
import { HomeScreen } from '../../screens';
import { buildHomeModel, buildHomeActions } from '../presenters';

/**
 * HomeRoute
 * Extracted from RegistrationRouter
 * Collapsed to app/handlers only
 * Refactored to use presenter functions
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function HomeRoute({ app, handlers }) {
  // Build props via presenter functions
  const model = buildHomeModel(app);
  const actions = buildHomeActions(app, handlers);

  // Route-internal state for location checking overlay
  const { mobile, TENNIS_CONFIG } = app;
  const { checkingLocation } = mobile;

  return (
    <>
      {checkingLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <p className="text-lg">{TENNIS_CONFIG.GEOLOCATION.CHECKING_MESSAGE}</p>
          </div>
        </div>
      )}
      <HomeScreen {...model} {...actions} />
    </>
  );
}
