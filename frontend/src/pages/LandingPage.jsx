import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Split,
  ShieldCheck,
  ArrowRight,
  Zap,
  Users,
  IndianRupee,
  Share2,
  Calculator,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import Button from '../components/common/Button.jsx';
import { Card } from '../components/common/Card.jsx';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface/85 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
              <Split className="w-5 h-5 font-bold" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-text">SplitTrack</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {user ? (
              <Link to="/dashboard">
                <Button size="sm" variant="primary" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text transition hidden sm:inline-block"
                >
                  Sign In
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary">
                    Start Tracking
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-16 sm:pt-24 pb-20 overflow-hidden px-4 sm:px-6">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-raised border border-border text-xs text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              Single source of truth for group trips & outings
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-text leading-[1.1]">
              Shared expenses, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                crystal-clear repayments.
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              When one person pays on a trip, friends say "I'll pay later" and everybody loses track.
              SplitTrack records every rupee in paise precision, sends private WhatsApp passbooks, and eliminates payment awkwardness.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link to={user ? '/dashboard' : '/register'} className="w-full sm:w-auto">
                <Button size="lg" variant="primary" fullWidth iconRight={<ArrowRight className="w-4 h-4" />}>
                  Create Your First Group
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" fullWidth>
                  Sign In with Demo Account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works in 3 Steps */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              How SplitTrack Works in 3 Easy Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <Card className="relative flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    1
                  </div>
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Add Friends
                  </span>
                </div>
                <h3 className="text-base font-bold text-text">Create Group & Add Members</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Add trip mates or roommates with just a name. Friends don't need accounts, phone verification, or passwords to participate.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-border text-[11px] text-text-muted flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Zero signup barriers for your group
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="relative flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                    2
                  </div>
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Log Expenses
                  </span>
                </div>
                <h3 className="text-base font-bold text-text">Log Splits in Paise Precision</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Split equally, with exact rupee sums, or by percentages. The safe mathematical engine guarantees every single paise balances exactly.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-border text-[11px] text-text-muted flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-sky-500 shrink-0" />
                Zero floating-point rounding errors
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="relative flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                    3
                  </div>
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    WhatsApp Share
                  </span>
                </div>
                <h3 className="text-base font-bold text-text">Send Private Passbook Links</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Generate instant WhatsApp passbooks. Friends see only their own itemized share and balance without snooping on other members.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-border text-[11px] text-text-muted flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-500 shrink-0" />
                One-click WhatsApp statement copy
              </div>
            </Card>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Built-In Safe Calculator</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Calculate complex food bills or trip expenses with operators, parentheses, and split remainder distribution right inside the app.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Pending Payments Inbox</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                When friends repay online or via cash, they submit repayment proofs. Hosts review and accept with one click to keep ledgers accurate.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Complete Privacy & Audit</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Friends never see each other's balances. Full immutable audit trail for host-controlled settlements and peace of mind.
              </p>
            </Card>
          </div>
        </section>

        {/* Ready to start CTA Banner */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-3xl bg-gradient-to-tr from-emerald-600/20 to-teal-500/10 border border-emerald-500/30 p-8 sm:p-12 text-center space-y-5 shadow-xl relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-text tracking-tight">
                Stop the "I'll pay later" awkwardness
              </h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Join thousands of hosts tracking road trips, flat expenses, and weekend getaways with clean Indian rupee accounting.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/register">
                <Button size="lg" variant="primary" iconRight={<ArrowRight className="w-4 h-4" />}>
                  Start Tracking Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-text-muted">
        SplitTrack © {new Date().getFullYear()} — Built with React, Tailwind CSS & PERN Stack
      </footer>
    </div>
  );
}
