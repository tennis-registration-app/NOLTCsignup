import React from 'react';
import { ClearCourtScreen } from '../../screens';
import { TennisBusinessLogic } from '@lib';

/**
 * ClearCourtRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Verbatim JSX. No behavior change.
 */
export function ClearCourtRoute({ app, handlers }) {
  // Destructure from app
  const { clearCourtFlow, alert, helpers, mobile, CONSTANTS } = app;
  const { clearCourtStep, setClearCourtStep, selectedCourtToClear, setSelectedCourtToClear } =
    clearCourtFlow;
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
