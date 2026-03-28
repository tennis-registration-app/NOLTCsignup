/**
 * ToastHost Component - Toast notification container
 *
 * Listens for 'UI_TOAST' custom events and displays toast notifications.
 * Toasts auto-dismiss after a configurable duration.
 *
 * Usage: window.dispatchEvent(new CustomEvent('UI_TOAST', {
 *   detail: { msg: 'Your message', type: 'warning', duration: 3000 }
 * }));
 *
 * Types: 'error' (red), 'warning' (amber), default (slate)
 */
import React, { useState, useEffect } from 'react';

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const t = {
        id: Date.now() + Math.random(),
        duration: 3000,
        type: 'warning',
        ...e.detail
      };
      setToasts((xs) => [...xs, t]);
      setTimeout(() => setToasts((xs) => xs.filter(x => x.id !== t.id)), t.duration);
    };

    window.addEventListener('UI_TOAST', onToast);
    return () => window.removeEventListener('UI_TOAST', onToast);
  }, []);

  return (
    <div className="fixed top-4 inset-x-0 z-[1000] flex justify-center pointer-events-none">
      <div className="w-full max-w-lg px-4 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg ring-1
              ${t.type === 'error'   ? 'bg-red-50   ring-red-200   text-red-800' :
                t.type === 'warning' ? 'bg-amber-50 ring-amber-200 text-amber-900' :
                                       'bg-slate-50 ring-slate-200 text-slate-900'}`}
          >
            <div className="text-sm">{t.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ToastHost;
