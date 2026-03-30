import React from 'react';
import type { AppState, Handlers } from '../../../types/appTypes';

interface ClearCourtRouteProps {
  app: AppState;
  handlers: Handlers;
}
import { ClearCourtScreen } from '../../screens';
import { TennisBusinessLogic } from '@lib';
import { useClearCourtFlow } from '../../court/useClearCourtFlow';

/**
 * ClearCourtRoute
 * Extracted from RegistrationRouter
 * Collapsed to app/handlers only
 * Verbatim JSX. No behavior change.
 *
 * ClearCourt state is route-local: useClearCourtFlow is called here,
 * not in the central state aggregation. Unmount resets state.
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function ClearCourtRoute({ app, handlers }: ClearCourtRouteProps) {
  // Route-local state — lives only while ClearCourt is mounted
  const { clearCourtStep, setClearCourtStep, selectedCourtToClear, setSelectedCourtToClear } =
    useClearCourtFlow();

  // Destructure from app
  const { alert, helpers, mobile, CONSTANTS } = app;
  const { showAlert, alertMessage } = alert;
  const { getCourtsOccupiedForClearing } = helpers;
  const { mobileFlow } = mobile;

  // Destructure from handlers
  const { clearCourt, resetForm, getCourtData } = handlers;

  return (
    <ClearCourtScreen
      clearCourtStep={clearCourtStep}
      setClearCourtStep={setClearCourtStep}
      selectedCourtToClear={selectedCourtToClear}
      setSelectedCourtToClear={setSelectedCourtToClear}
      clearCourt={clearCourt}
      resetForm={resetForm}
      showAlert={showAlert}
      alertMessage={alertMessage}
      getCourtsOccupiedForClearing={getCourtsOccupiedForClearing}
      courtData={getCourtData()}
      CONSTANTS={CONSTANTS}
      TennisBusinessLogic={TennisBusinessLogic}
      mobileFlow={mobileFlow}
    />
  );
}
