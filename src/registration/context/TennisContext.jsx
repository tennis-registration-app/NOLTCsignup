/**
 * TennisContext - Provides tennis service to all child components
 */

import React, { createContext, useContext } from 'react';
import { useTennisService } from '../hooks/useTennisService.js';

const TennisContext = createContext(null);

export function TennisProvider({ children, deviceId, deviceType }) {
  const tennis = useTennisService({ deviceId, deviceType });

  return (
    <TennisContext.Provider value={tennis}>
      {children}
    </TennisContext.Provider>
  );
}

export function useTennis() {
  const context = useContext(TennisContext);
  if (!context) {
    throw new Error('useTennis must be used within a TennisProvider');
  }
  return context;
}

export { TennisContext };
