import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { springs, durations } from '../../motion/tokens.js';

export default function ThemeToggle({ className = '', compact = false }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: 'light', label: 'Light mode', icon: Sun },
    { id: 'dark', label: 'Dark mode', icon: Moon },
    { id: 'system', label: 'System theme', icon: Monitor },
  ];

  if (compact) {
    // Single cycling button for ultra-compact headers / mobile corners
    const cycleTheme = () => {
      if (theme === 'system') setTheme('light');
      else if (theme === 'light') setTheme('dark');
      else setTheme('system');
    };

    const currentOption = options.find((o) => o.id === theme) || options[2];
    const Icon = currentOption.icon;

    return (
      <m.button
        type="button"
        whileTap={{ scale: 0.92 }}
        transition={springs.snappy}
        onClick={cycleTheme}
        aria-label={`Current theme: ${currentOption.label}. Click to cycle.`}
        title={`Theme: ${currentOption.label}`}
        className={`relative p-2 rounded-xl text-text-muted hover:text-text bg-surface-raised hover:bg-surface border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 overflow-hidden cursor-pointer ${className}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={theme}
            initial={{ rotate: -70, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 70, scale: 0.6, opacity: 0 }}
            transition={{ ...springs.snappy, duration: durations.fast }}
            className="flex items-center justify-center"
          >
            <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </m.span>
        </AnimatePresence>
      </m.button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={`inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface-raised border border-border ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;

        return (
          <m.button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            title={opt.label}
            whileTap={{ scale: 0.93 }}
            onClick={() => setTheme(opt.id)}
            className={`relative p-1.5 rounded-lg flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer ${
              isSelected ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-text-muted hover:text-text'
            }`}
          >
            {isSelected && (
              <m.div
                layoutId="theme-pill-indicator"
                transition={springs.smooth}
                style={{ borderRadius: 8 }}
                className="absolute inset-0 bg-surface shadow-xs border border-border"
              />
            )}
            <m.span
              animate={{ scale: isSelected ? 1.05 : 1 }}
              transition={springs.snappy}
              className="relative z-10 flex items-center justify-center"
            >
              <Icon className="w-3.5 h-3.5" />
            </m.span>
          </m.button>
        );
      })}
    </div>
  );
}
