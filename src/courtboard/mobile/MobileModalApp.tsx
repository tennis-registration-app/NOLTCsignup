import React, { useState, useEffect } from 'react';
import { MobileModalSheet } from './MobileModalSheet';
import { isMobileView, getMobileModal } from '../../platform/windowBridge.js';

/**
 * MobileModalApp Component - manages modal state and listens for events
 * Mounts in a separate React root for mobile modal system
 */
export function MobileModalApp() {
  const [state, setState] = useState({ open: false, type: null, payload: null });

  useEffect(() => {
    if (!isMobileView()) return;

    const onOpen = (e) => {
      setState({ open: true, type: e.detail.type, payload: e.detail.payload || null });
      document.getElementById('mobile-modal-root')?.classList.add('modal-open');
    };
    const onClose = () => {
      setState({ open: false, type: null, payload: null });
      document.getElementById('mobile-modal-root')?.classList.remove('modal-open');
    };

    document.addEventListener('mm:open', onOpen);
    document.addEventListener('mm:close', onClose);

    return () => {
      document.removeEventListener('mm:open', onOpen);
      document.removeEventListener('mm:close', onClose);
    };
  }, []);

  if (!isMobileView() || !state.open) return null;
  return (
    <MobileModalSheet
      type={state.type}
      payload={state.payload}
      onClose={getMobileModal()?.close || (() => {})}
    />
  );
}
