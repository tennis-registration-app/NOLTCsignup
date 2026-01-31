// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
// WP5.9.4.2: Streamlined to use useRegistrationAppState and useRegistrationHandlers
// WP7.0: Collapsed prop enumeration - handlers now receive { app } directly
/* global Tennis */
import React from 'react';

// Import registration-specific services
import { GeolocationService } from './services';

// Registration router (WP5.9.1)
import { RegistrationRouter } from './router';

// Registration state and handlers hooks (WP5.9.3, WP5.9.4)
import { useRegistrationHandlers, useRegistrationAppState } from './appHandlers';

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.GeolocationService = window.GeolocationService || GeolocationService;

// Main TennisRegistration Component
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  // Get all state, effects, hooks, and derived values
  const app = useRegistrationAppState({ isMobileView });

  // Get all handlers, passing the app object (WP7.0)
  const handlers = useRegistrationHandlers({ app });

  // Render the router with grouped props only (WP6.0.2b)
  return <RegistrationRouter app={app} handlers={handlers} />;
};

export default TennisRegistration;
