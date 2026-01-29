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
 *
 * Handles screen routing based on currentScreen state.
 * All props are passed through from App.jsx.
 */
export default function RegistrationRouter(props) {
  const { currentScreen, mobileMode, showSuccess } = props;

  // Silent assign loading screen (mobile waitlist assignment in progress)
  if (mobileMode === 'silent-assign') {
    return <SilentAssignRoute />;
  }

  // Success screen
  if (showSuccess) {
    return <SuccessRoute {...props} />;
  }

  // Home screen (combined Welcome + Search)
  if (currentScreen === 'home') {
    return <HomeRoute {...props} />;
  }

  // Admin screen
  if (currentScreen === 'admin') {
    return <AdminRoute {...props} />;
  }

  // Group management screen
  if (currentScreen === 'group') {
    return <GroupRoute {...props} />;
  }

  // Court selection screen
  if (currentScreen === 'court') {
    return <CourtRoute {...props} />;
  }

  // Clear court screen
  if (currentScreen === 'clearCourt') {
    return <ClearCourtRoute {...props} />;
  }

  return null;
}
