import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { AlertTriangle, X } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { springs } from '../../motion/tokens.js';

export default function PasswordChangedBanner() {
  const { user, dismissPasswordNotice } = useAuth();

  if (!user || !user.passwordChangeNoticePending) {
    return null;
  }

  const methodMap = {
    reset_link: 'reset link',
    reset_code: 'reset code',
    recovery_code: 'recovery code',
  };

  const methodText = methodMap[user.passwordChangeMethod] || 'recovery method';

  const dateFormatted = user.passwordChangedAt
    ? new Date(user.passwordChangedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'recently';

  return (
    <AnimatePresence>
      <m.aside
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={springs.snappy}
        role="alert"
        aria-live="assertive"
        className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 sm:py-2 z-40 relative overflow-hidden"
      >
        <div className="max-w-5xl mx-auto relative flex items-center justify-center px-7 sm:px-10 min-h-[1.75rem]">
          <p className="text-center text-xs sm:text-sm font-medium leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 inline-block align-text-bottom mr-1.5 -mt-0.5" />
            <span>
              Your password was changed on <span className="font-semibold">{dateFormatted}</span> via{' '}
              <span className="font-semibold">{methodText}</span>. If this wasn't you, reset it immediately or contact an admin.
            </span>
          </p>
          <button
            onClick={dismissPasswordNotice}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-amber-500/20 active:scale-95 text-amber-800 dark:text-amber-200 transition shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            aria-label="Dismiss password change notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </m.aside>
    </AnimatePresence>
  );
}
