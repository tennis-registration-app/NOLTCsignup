import React from 'react';
import { ClearCourtScreen } from '../../screens';
import { TennisBusinessLogic } from '@lib';

/**
 * ClearCourtRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Added app/handlers grouping — WP6.0.2a
 * Verbatim JSX. No behavior change.
 */
export function ClearCourtRoute(props) {
  // Bridge mode: prefer app/handlers, fallback to props for compatibility
  const app = props.app ?? props;
  const handlers = props.handlers ?? props;

  // Destructure from app (state/config)
  const {
    clearCourtStep = app.clearCourtFlow?.clearCourtStep,
    setClearCourtStep = app.clearCourtFlow?.setClearCourtStep,
    selectedCourtToClear = app.clearCourtFlow?.selectedCourtToClear,
    setSelectedCourtToClear = app.clearCourtFlow?.setSelectedCourtToClear,
    showAlert = app.alert?.showAlert,
    alertMessage = app.alert?.alertMessage,
    getCourtsOccupiedForClearing = app.helpers?.getCourtsOccupiedForClearing,
    CONSTANTS = app.CONSTANTS,
    mobileFlow = app.mobile?.mobileFlow,
  } = props;

  // Destructure from handlers
  const {
    clearCourt = handlers.clearCourt,
    resetForm = handlers.resetForm,
    getCourtData = handlers.getCourtData,
  } = props;

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
