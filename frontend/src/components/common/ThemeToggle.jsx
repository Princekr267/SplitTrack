import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

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
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`Current theme: ${currentOption.label}. Click to cycle.`}
        title={`Theme: ${currentOption.label}`}
        className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={`inline-flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.id)}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isSelected
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
