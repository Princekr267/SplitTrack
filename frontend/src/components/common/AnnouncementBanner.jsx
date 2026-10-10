import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, X } from 'lucide-react';
import api from '../../api/client.js';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadAnnouncement() {
      try {
        const res = await api.get('/settings/public');
        if (mounted && res.success && res.data?.announcement?.enabled && res.data.announcement.message) {
          const msg = res.data.announcement.message;
          const dismissedMsg =
            sessionStorage.getItem('splitorbit_dismissed_announcement') ||
            sessionStorage.getItem('splittrack_dismissed_announcement');
          if (dismissedMsg !== msg) {
            setAnnouncement(res.data.announcement);
          }
        }
      } catch {
        // Silently fail if public settings not reachable
      }
    }
    loadAnnouncement();
    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement || dismissed) return null;

  const isWarning = announcement.level === 'warning';

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('splitorbit_dismissed_announcement', announcement.message);
  };

  return (
    <div
      role="alert"
      className={`w-full px-4 py-2 sm:py-2.5 text-xs font-medium border-b transition-colors relative ${
        isWarning
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-brand-500/15 border-brand-500/30 text-brand-900 dark:text-brand-200'
      }`}
    >
      <div className="max-w-5xl mx-auto relative flex items-center justify-center px-7 sm:px-10 min-h-[1.5rem]">
        <p className="text-center text-xs sm:text-sm font-medium leading-relaxed">
          {isWarning ? (
            <AlertTriangle className="w-4 h-4 shrink-0 inline-block align-text-bottom mr-1.5 -mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Info className="w-4 h-4 shrink-0 inline-block align-text-bottom mr-1.5 -mt-0.5 text-brand-600 dark:text-brand-400" />
          )}
          {/* Strictly plain text rendering - NO dangerouslySetInnerHTML */}
          <span>{String(announcement.message)}</span>
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-current cursor-pointer transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
