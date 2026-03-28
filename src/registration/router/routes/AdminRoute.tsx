// @ts-check
import React from 'react';
import { AdminScreen } from '../../screens';
import { buildAdminModel, buildAdminActions } from '../presenters';

/**
 * AdminRoute
 * Extracted from RegistrationRouter
 * Collapsed to app/handlers only
 * Refactored to use presenter functions
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
