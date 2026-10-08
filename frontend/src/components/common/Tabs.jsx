import React from 'react';

/**
 * Accessible Tab Navigation component supporting icons, counters, and pulse badges.
 */
export default function Tabs({
  tabs = [], // [{ id, label, icon, count, badgeAlert }]
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div
      role="tablist"
      aria-label="Content sections"
      className={`border-b border-border flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              pb-3 pt-1 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all duration-150 shrink-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-t-lg
              ${
                isActive
                  ? 'border-brand-500 text-text'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }
            `}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-text-muted'}`} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none
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
          </button>
        );
      })}
    </div>
  );
}
