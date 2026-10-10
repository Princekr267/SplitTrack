import React from 'react';
import { m } from 'motion/react';
import { springs } from '../../motion/tokens.js';

/**
 * Accessible Tab Navigation component supporting icons, counters, and pulse badges
 * with a physics-based sliding active indicator.
 */
export default function Tabs({
  tabs = [], // [{ id, label, icon, count, badgeAlert }]
  activeTab,
  onChange,
  className = '',
  layoutId = 'active-tab-indicator',
}) {
  return (
    <div
      role="tablist"
      aria-label="Content sections"
      className={`border-b border-border flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar relative ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <m.button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={springs.snappy}
            onClick={() => onChange(tab.id)}
            className={`
              relative pb-3 pt-1 text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-t-lg transition-colors ${tab.className || ''}
              ${
                isActive
                  ? 'text-text'
                  : 'text-text-muted hover:text-text'
              }
            `}
          >
            {Icon && (
              <m.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={springs.snappy}
                className="flex items-center"
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-text-muted'}`} />
              </m.div>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none transition-colors
                  ${
                    isActive
                      ? 'bg-brand-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-surface-raised text-text-muted'
                  }
                `}
              >
                {tab.count}
              </span>
            )}
            {tab.badgeAlert && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}

            {/* Sliding Active Underline */}
            {isActive && (
              <m.div
                layoutId={layoutId}
                transition={springs.smooth}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
              />
            )}
          </m.button>
        );
      })}
    </div>
  );
}
