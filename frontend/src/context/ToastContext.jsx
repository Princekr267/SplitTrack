import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { durations, easings } from '../motion/tokens.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';

            return (
              <m.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  y: 10,
                  transition: { duration: durations.fast, ease: easings.easeIn },
                }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 340,
                  mass: 0.85,
                }}
                className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-colors ${
                  isSuccess
                    ? 'bg-white dark:bg-emerald-950/90 text-slate-900 dark:text-emerald-100 border-emerald-500/40 shadow-emerald-500/10'
                    : isError
                    ? 'bg-white dark:bg-rose-950/90 text-slate-900 dark:text-rose-100 border-rose-500/40 shadow-rose-500/10'
                    : 'bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
                  <p className="text-sm font-medium leading-tight truncate">{toast.message}</p>
                </div>
                <m.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg shrink-0 transition cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </m.button>
              </m.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
