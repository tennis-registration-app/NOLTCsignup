// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
// Streamlined to use useRegistrationAppState and useRegistrationHandlers
// Collapsed prop enumeration - handlers now receive { app } directly
import React from 'react';

// Import registration-specific services
import { GeolocationService } from './services';

// Registration router
import { RegistrationRouter } from './router';

// Registration state and handlers hooks
import { useRegistrationHandlers, useRegistrationAppState } from './appHandlers';

// Window global setters
import { ensureTennisGlobal, setGeolocationServiceGlobal } from '../platform/registerGlobals.js';

// Global service aliases for backward compatibility with other scripts
ensureTennisGlobal();
if (!window.GeolocationService) setGeolocationServiceGlobal(GeolocationService);

// Main TennisRegistration Component
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  // Get all state, effects, hooks, and derived values
  const app = useRegistrationAppState({ isMobileView });

  // Get all handlers, passing the app object
  const handlers = useRegistrationHandlers({ app });

  // Render the router with grouped props only
  return <RegistrationRouter app={app} handlers={handlers} />;
};

export default TennisRegistration;
