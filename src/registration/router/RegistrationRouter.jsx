// @ts-check
import React from 'react';
import {
  SuccessRoute,
  SilentAssignRoute,
  HomeRoute,
  AdminRoute,
  GroupRoute,
  CourtRoute,
  ClearCourtRoute,
} from './routes';

/**
 * RegistrationRouter
 * Extracted from App.jsx — WP5.9.1
 * Refactored to delegate to route components — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 *
 * Handles screen routing based on currentScreen state.
 * Routes receive only { app, handlers }.
 *
 * @param {{
 *   app: import('../../types/appTypes').AppState,
 *   handlers: import('../../types/appTypes').Handlers
 * }} props
 */
export default function RegistrationRouter({ app, handlers }) {
  const { currentScreen } = app.state;
  const { mobileMode } = app.mobile;
  const { showSuccess } = app.state;

  // Silent assign loading screen (mobile waitlist assignment in progress)
  if (mobileMode === 'silent-assign') {
    return <SilentAssignRoute />;
  }

  // Success screen
  if (showSuccess) {
    return <SuccessRoute app={app} handlers={handlers} />;
  }

  // Home screen (combined Welcome + Search)
  if (currentScreen === 'home') {
    return <HomeRoute app={app} handlers={handlers} />;
  }

  // Admin screen
  if (currentScreen === 'admin') {
    return <AdminRoute app={app} handlers={handlers} />;
  }

  // Group management screen
  if (currentScreen === 'group') {
    return <GroupRoute app={app} handlers={handlers} />;
  }

  // Court selection screen
  if (currentScreen === 'court') {
    return <CourtRoute app={app} handlers={handlers} />;
  }

  // Clear court screen
  if (currentScreen === 'clearCourt') {
    return <ClearCourtRoute app={app} handlers={handlers} />;
  }

  return null;
}
