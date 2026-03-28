import React, { useState, useEffect } from 'react';

/**
 * ToastHost - Global toast notification container
 * Listens for UI_TOAST events and displays notifications
 */
export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const t = { id: Date.now() + Math.random(), duration: 3000, type: 'warning', ...e.detail };
      setToasts((xs) => [...xs, t]);
      setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== t.id)), t.duration);
    };
    window.addEventListener('UI_TOAST', onToast);
    return () => window.removeEventListener('UI_TOAST', onToast);
  }, []);

  return (
    <div className="fixed top-4 inset-x-0 z-[1000] flex justify-center pointer-events-none">
      <div className="w-full max-w-lg px-4 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg ring-1 ${
              t.type === 'error'
                ? 'bg-red-50 ring-red-200 text-red-800'
                : t.type === 'success'
                  ? 'bg-green-50 ring-green-200 text-green-800'
                  : 'bg-yellow-50 ring-yellow-200 text-yellow-800'
            }`}
          >
            {t.msg || t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
