// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
// Streamlined to use useRegistrationAppState and useRegistrationHandlers
// Collapsed prop enumeration - handlers now receive { app } directly
import React, { useState, useCallback } from 'react';

// Import registration-specific services
import { GeolocationService } from './services';

// Registration router
import { RegistrationRouter } from './router';

// Registration state and handlers hooks
import { useRegistrationHandlers, useRegistrationAppState } from './appHandlers';

// Workflow provider — per-flow state that resets via key-based remount
import { WorkflowProvider } from './context/WorkflowProvider';

// TennisBackend singleton (shared with useRegistrationAppState)
import { createBackend } from '../lib/backend/index.js';

// Window global setters
import { ensureTennisGlobal, setGeolocationServiceGlobal } from '../platform/registerGlobals.js';

// Global service aliases for backward compatibility with other scripts
ensureTennisGlobal();
if (!window.GeolocationService) setGeolocationServiceGlobal(GeolocationService);

// Backend singleton — must be the same instance used inside useRegistrationAppState
const backend = createBackend();

/**
 * AppInner — calls useRegistrationAppState (which reads WorkflowContext)
 * and useRegistrationHandlers.
 *
 * Lives inside WorkflowProvider so all workflow hooks are available via context.
 *
 * @param {{ isMobileView: boolean, resetWorkflow: () => void }} props
 */
function AppInner({ isMobileView, resetWorkflow }) {
  // Get all state, effects, hooks, and derived values
  const app = useRegistrationAppState({ isMobileView });

  // Attach resetWorkflow so handlers can trigger key-based reset
  app.resetWorkflow = resetWorkflow;

  // Get all handlers, passing the app object
  const handlers = useRegistrationHandlers({ app });

  // Render the router with grouped props only
  return <RegistrationRouter app={app} handlers={handlers} />;
}

/**
 * TennisRegistration — outer component that owns the workflow key.
 *
 * Bumping workflowKey causes React to unmount and remount WorkflowProvider,
 * resetting all per-flow state (group, streak, court assignment, member identity,
 * and 15 workflow useState fields) to initial values.
 */
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  const [workflowKey, setWorkflowKey] = useState(0);

  const resetWorkflow = useCallback(() => {
    setWorkflowKey((k) => k + 1);
  }, []);

  return (
    <WorkflowProvider key={workflowKey} backend={backend}>
      <AppInner isMobileView={isMobileView ?? false} resetWorkflow={resetWorkflow} />
    </WorkflowProvider>
  );
};

export default TennisRegistration;
