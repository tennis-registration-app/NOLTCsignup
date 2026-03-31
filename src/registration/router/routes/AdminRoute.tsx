import React from 'react';
import type { AppState, Handlers } from '../../../types/appTypes';

interface AdminRouteProps {
  app: AppState;
  handlers: Handlers;
}
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
export function AdminRoute({ app, handlers }: AdminRouteProps) {
  // Build props via presenter functions
  const model = buildAdminModel(app, handlers);
  const actions = buildAdminActions(app, handlers);

  const _p = { ...model, ...actions };
  return <AdminScreen {...(_p as unknown as import("../../screens/AdminScreen").AdminScreenProps)} />;
}
