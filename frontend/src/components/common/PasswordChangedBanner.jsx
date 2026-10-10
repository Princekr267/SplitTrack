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
        className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 z-40 relative"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="truncate">
              Your password was changed on <span className="font-semibold">{dateFormatted}</span> via{' '}
              <span className="font-semibold">{methodText}</span>. If this wasn't you, reset it immediately or contact an admin.
            </p>
          </div>
          <button
            onClick={dismissPasswordNotice}
            className="p-1 rounded-md hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition shrink-0"
            aria-label="Dismiss password change notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </m.aside>
    </AnimatePresence>
  );
}
