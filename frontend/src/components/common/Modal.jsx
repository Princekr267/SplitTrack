import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in transition-colors"
    >
      <div
        className={`w-full ${maxWidth} bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-text transition-colors`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <h3 className="text-base font-bold text-text tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-raised transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
