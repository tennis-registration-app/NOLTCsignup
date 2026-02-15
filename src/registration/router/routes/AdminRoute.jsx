// @ts-check
import React from 'react';
import { AdminScreen } from '../../screens';
import { buildAdminModel, buildAdminActions } from '../presenters';

/**
 * AdminRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Refactored to use presenter functions — WP8.0
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function AdminRoute({ app, handlers }) {
  // Build props via presenter functions
  const model = buildAdminModel(app, handlers);
  const actions = buildAdminActions(app, handlers);

  return <AdminScreen {...model} {...actions} />;
}
