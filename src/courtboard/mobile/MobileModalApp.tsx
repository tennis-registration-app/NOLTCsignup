import React, { useState, useEffect } from 'react';
import { MobileModalSheet } from './MobileModalSheet';
import { isMobileView, getMobileModal } from '../../platform/windowBridge.js';

/**
 * MobileModalApp Component - manages modal state and listens for events
 * Mounts in a separate React root for mobile modal system
 */
export function MobileModalApp() {
  const [state, setState] = useState<{ open: boolean; type: string | null; payload: unknown }>({ open: false, type: null, payload: null });

  useEffect(() => {
    if (!isMobileView()) return;

    const onOpen = (e: Event) => {
      const ce = e as CustomEvent;
      setState({ open: true, type: (ce.detail as Record<string,unknown>).type as string || null, payload: (ce.detail as Record<string,unknown>).payload as unknown || null });
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
      payload={state.payload as Record<string, unknown> | null}
      onClose={getMobileModal()?.close as (() => void) || (() => {})}
    />
  );
}
