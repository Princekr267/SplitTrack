import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Split, LogOut, PlusCircle, Shield, Calculator as CalcIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';
import { m, useScroll, useMotionValueEvent } from 'motion/react';
import { springs } from '../../motion/tokens.js';

export default function Navbar({ onOpenNewGroup }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const shouldBeScrolled = latest > 20;
    if (shouldBeScrolled !== isScrolled) {
      setIsScrolled(shouldBeScrolled);
    }
  });

  // Handle initial scroll state on mount
  useEffect(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ease-out ${
        isScrolled ? 'pt-2 px-3 sm:px-6' : 'pt-0 px-0'
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-between transition-all duration-300 ease-out ${
          isScrolled
            ? 'max-w-5xl h-13 px-4 sm:px-5 rounded-2xl bg-surface/90 backdrop-blur-xl border border-border shadow-lg shadow-slate-950/5 dark:shadow-slate-950/40'
            : 'max-w-6xl h-16 px-4 sm:px-6 rounded-none bg-surface/85 backdrop-blur-md border-b border-border'
        }`}
      >
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <m.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20"
          >
            <Split className="w-5 h-5 font-bold" />
          </m.div>
          <span className="font-extrabold text-xl tracking-tight text-text group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
            SplitTrack
          </span>
        </Link>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Calculator Trigger */}
          <m.button
            type="button"
            data-calculator-trigger="true"
            whileTap={{ scale: 0.92 }}
            transition={springs.snappy}
            onClick={() => window.dispatchEvent(new CustomEvent('splittrack:toggle-calculator'))}
            title="Financial Calculator"
            aria-label="Toggle financial calculator"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-raised transition-colors border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            <CalcIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </m.button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {user ? (
            <>
              {onOpenNewGroup && (
                <m.button
                  whileTap={{ scale: 0.95 }}
                  transition={springs.snappy}
                  onClick={onOpenNewGroup}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors shadow-md shadow-brand-500/10 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Group
                </m.button>
              )}

              <Link
                to="/dashboard"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
              >
                Dashboard
              </Link>

              <Link
                to="/friend"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition-colors hidden sm:inline-block"
              >
                Friend Passbook
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors shadow-xs"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}

              <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center text-text text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-text hidden md:inline truncate max-w-[120px]">
                  {user.name}
                </span>

                <m.button
                  whileTap={{ scale: 0.92 }}
                  transition={springs.snappy}
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-surface-raised transition-colors ml-0.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </m.button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
