import React from 'react';
import SystemSettings from '../screens/SystemSettings';

export function SystemSection({ backend, onSettingsChanged }) {
  return <SystemSettings backend={backend} onSettingsChanged={onSettingsChanged} />;
}
