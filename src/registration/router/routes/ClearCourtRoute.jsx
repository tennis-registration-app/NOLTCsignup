import React from 'react';
import { ClearCourtScreen } from '../../screens';
import { TennisBusinessLogic } from '@lib';

/**
 * ClearCourtRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Verbatim JSX. No behavior change.
 */
export function ClearCourtRoute(props) {
  const {
    clearCourtStep,
    setClearCourtStep,
    selectedCourtToClear,
    setSelectedCourtToClear,
    clearCourt,
    resetForm,
    showAlert,
    alertMessage,
    getCourtsOccupiedForClearing,
    getCourtData,
    CONSTANTS,
    mobileFlow,
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
