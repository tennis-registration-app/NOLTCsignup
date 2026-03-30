import React from 'react';
import SystemSettings from '../screens/SystemSettings';

interface SystemSectionProps {
  backend?: unknown;
  onSettingsChanged?: () => void;
}

export function SystemSection({ backend, onSettingsChanged }: SystemSectionProps) {
  return <SystemSettings backend={backend} onSettingsChanged={onSettingsChanged} />;
}
