import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Split,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/date.js';
import ThemeToggle from '../components/common/ThemeToggle.jsx';

export default function InviteAcceptPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/invite/${code}`);
        if (res.success) {
          setInviteData(res.data);
        }
      } catch (err) {
        setError(err.message || 'This invite link is invalid, expired, or already claimed.');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      fetchInvite();
    }
  }, [code]);

  const handleClaim = async () => {
    if (!user) {
      navigate(`/login?returnUrl=/invite/${code}`);
      return;
    }

    try {
      setClaiming(true);
      const res = await api.post(`/invite/${code}/accept`);
      if (res.success) {
        setClaimedSuccess(true);
        addToast('Profile claimed! Linked to your account 🎉', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to claim profile', 'error');
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-slate-400">Verifying invite link...</p>
      </div>
    );
  }

  // Error State
  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Invite Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-2 mb-6 leading-relaxed">
          {error || 'This invite link is no longer valid or has already been claimed.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 transition"
        >
          Go to SplitOrbit
        </Link>
      </div>
    );
  }

  // Claimed Success State
  if (claimedSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">You're All Set! 🎉</h2>
        <p className="text-xs text-slate-300 max-w-sm mt-2 mb-6 leading-relaxed">
          You have successfully linked <span className="text-white font-bold">{inviteData.personName}</span> from{' '}
          <span className="text-white font-bold">{inviteData.groupName}</span> to your account.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/friend"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 transition shadow-lg shadow-brand-500/20"
          >
            <span>Open Friend Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            Host Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Active Invite Card
  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <Split className="w-6 h-6 font-bold" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-text">SplitOrbit</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <UserCheck className="w-3 h-3" />
          Single-Use Member Invite
        </span>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 border border-border transition-colors">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              You are invited to join
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {inviteData.groupName}
            </h1>
            {inviteData.groupDescription && (
              <p className="text-xs text-slate-400 mt-1">{inviteData.groupDescription}</p>
            )}
          </div>

          {/* Person Profile Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Profile to Claim
            </span>
            <div className="text-lg font-bold text-emerald-400">{inviteData.personName}</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Claiming links this member profile to your SplitOrbit account so you can view your personal statements and submit payments.
            </p>
          </div>

          {inviteData.expiresAt && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Valid until {formatDate(inviteData.expiresAt)}</span>
            </div>
          )}

          {/* Action based on auth status */}
          {user ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-brand-400 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  Claiming as <span className="font-bold text-white">{user.name}</span> ({user.email})
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {claiming ? (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Claim Profile & Link Account</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-400 text-center">
                Please sign in or create an account to claim this profile:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`/login?returnUrl=/invite/${code}`}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-center bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition"
                >
                  Sign In
                </Link>
                <Link
                  to={`/register?returnUrl=/invite/${code}`}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-center bg-brand-500 text-slate-950 hover:bg-brand-400 transition shadow-md shadow-brand-500/20"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
