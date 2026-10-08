import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Split, LogOut, User, PlusCircle, Shield, Calculator as CalcIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar({ onOpenNewGroup }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <Split className="w-5 h-5 font-bold" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-text group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
            SplitTrack
          </span>
        </Link>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Calculator Trigger */}
          <button
            type="button"
            data-calculator-trigger="true"
            onClick={() => window.dispatchEvent(new CustomEvent('splittrack:toggle-calculator'))}
            title="Financial Calculator"
            aria-label="Toggle financial calculator"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-raised transition border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <CalcIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Theme Toggle (both desktop and mobile) */}
          <ThemeToggle />

          {user ? (
            <>
              {onOpenNewGroup && (
                <button
                  onClick={onOpenNewGroup}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition shadow-md shadow-brand-500/10"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Group
                </button>
              )}

              <Link
                to="/dashboard"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition"
              >
                Dashboard
              </Link>

              <Link
                to="/friend"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-raised transition hidden sm:inline-block"
              >
                Friend Passbook
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition"
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

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-surface-raised transition ml-0.5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition shadow-sm"
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
