import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  ChevronDown,
  FileText,
  AlignLeft,
  Link2,
  Share2,
  RefreshCw,
  ExternalLink,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function PersonCopyDropdown({ group, person }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const dropdownRef = useRef(null);
  const { addToast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Generate Short Text
  const getShortText = () => {
    const owes = person.remainingToPay > 0;
    const isOwed = person.groupOwesYou > 0;

    const balanceLine = owes
      ? `• Balance Due: ${formatINR(person.remainingToPay)} (owes host)`
      : isOwed
      ? `• Balance: Host owes you ${formatINR(person.groupOwesYou)}`
      : `• Balance: Fully Settled (₹0.00)`;

    return `SplitTrack • ${group.name}
Statement for ${person.name}:
• Total Share: ${formatINR(person.shareSplitsTotal)}
• Paid / Repaid: ${formatINR(person.acceptedSentPaymentsTotal)}
${balanceLine}`;
  };

  const handleCopyShort = async () => {
    try {
      const text = getShortText();
      await navigator.clipboard.writeText(text);
      addToast('Copied short statement to clipboard! 📋', 'success');
      setIsOpen(false);
    } catch (err) {
      addToast('Failed to copy to clipboard', 'error');
    }
  };

  // 2. Generate Detailed Itemized Text (WhatsApp Ready)
  const handleCopyDetailed = async () => {
    try {
      setLoadingStatement(true);
      const res = await api.get(`/groups/${group.id}/people/${person.id}/statement`);
      if (!res.success) throw new Error('Could not fetch statement');

      const data = res.data;
      const expLines =
        data.expenses.length > 0
          ? data.expenses
              .map(
                (e) =>
                  `• ${formatDate(e.date)}: ${e.title} — *${formatINR(e.personShare)}* (Paid by ${e.paidBy})`
              )
              .join('\n')
          : '• No expenses recorded';

      const payLines =
        data.payments.length > 0
          ? data.payments
              .map(
                (p) =>
                  `• ${formatDate(p.date)}: *${formatINR(p.amount)}* (${p.mode.toUpperCase()}) — ${p.status.toUpperCase()}`
              )
              .join('\n')
          : '• No payments recorded';

      const owes = data.summary.remainingToPay > 0;
      const isOwed = data.summary.groupOwesYou > 0;
      const balanceStr = owes
        ? `*Balance Due (Owes Host):* *${formatINR(data.summary.remainingToPay)}*`
        : isOwed
        ? `*Group Owes You:* *${formatINR(data.summary.groupOwesYou)}*`
        : `*Status:* *Settled (₹0.00)*`;

      const detailedText = `*SplitTrack: ${group.name}* 💸
Statement for: *${person.name}*
━━━━━━━━━━━━━━━━━━━
*EXPENSES:*
${expLines}

*PAYMENTS:*
${payLines}

━━━━━━━━━━━━━━━━━━━
*Total Share:* ${formatINR(data.summary.shareSplitsTotal)}
*Total Repaid:* ${formatINR(data.summary.acceptedSentTotal)}
${balanceStr}`;

      await navigator.clipboard.writeText(detailedText);
      addToast('Copied detailed WhatsApp statement! 📑', 'success');
      setIsOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to copy detailed statement', 'error');
    } finally {
      setLoadingStatement(false);
    }
  };

  // 3. Generate or Copy Share View Link
  const handleShareLink = async () => {
    try {
      setGeneratingLink(true);
      const res = await api.post(`/groups/${group.id}/people/${person.id}/share-link`);
      if (res.success && res.data?.viewUrl) {
        await navigator.clipboard.writeText(res.data.viewUrl);
        addToast('Private statement link generated & copied! 🔗', 'success');
        setIsOpen(false);
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate share link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  // 4. Generate or Copy Level 2 Claim Invite Link
  const handleInviteLink = async () => {
    try {
      setGeneratingInvite(true);
      const res = await api.post(`/groups/${group.id}/people/${person.id}/invite`);
      if (res.success && res.data?.inviteUrl) {
        await navigator.clipboard.writeText(res.data.inviteUrl);
        addToast(`Invite link copied for ${person.name}! Valid for 7 days. ✉️`, 'success');
        setIsOpen(false);
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate invite link', 'error');
    } finally {
      setGeneratingInvite(false);
    }
  };

  // 5. Direct Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShortText());
    let cleanPhone = (person.phone || '').replace(/[^0-9]/g, '');

    // Format Indian numbers if 10 digits without country code
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-raised text-text-muted hover:text-text border border-border transition shadow-sm"
        title="Share & Copy Statement"
      >
        <Copy className="w-3.5 h-3.5 text-text-muted" />
        <span>Share</span>
        <ChevronDown className="w-3 h-3 text-text-muted ml-0.5" />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-surface border border-border shadow-2xl py-1.5 z-30 backdrop-blur-xl animate-fade-in text-xs space-y-0.5 transition-colors">
          <button
            onClick={handleCopyShort}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-text hover:bg-surface-raised transition"
          >
            <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold block">Copy Short</span>
              <span className="text-[10px] text-text-muted block">Total, paid & remaining</span>
            </div>
          </button>

          <button
            onClick={handleCopyDetailed}
            disabled={loadingStatement}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-text hover:bg-surface-raised transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <span className="font-semibold block">
                {loadingStatement ? 'Loading...' : 'Copy Detailed (WhatsApp)'}
              </span>
              <span className="text-[10px] text-text-muted block">Itemized expenses & dates</span>
            </div>
          </button>

          {!person.isHost && (
            <>
              <button
                onClick={handleShareLink}
                disabled={generatingLink}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-text hover:bg-surface-raised transition disabled:opacity-50"
              >
                <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <span className="font-semibold block">
                    {generatingLink
                      ? 'Generating...'
                      : person.shareEnabled
                      ? 'Regenerate View Link'
                      : 'Generate View Link'}
                  </span>
                  <span className="text-[10px] text-text-muted block">
                    {person.shareEnabled ? 'Replaces old link' : 'Private read-only link'}
                  </span>
                </div>
              </button>

              {person.linkedUserId ? (
                <div className="px-3 py-2 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg mx-1">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold block">Account Linked</span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">
                      Claimed by SplitTrack user
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleInviteLink}
                  disabled={generatingInvite}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-text hover:bg-surface-raised transition disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">
                      {generatingInvite ? 'Generating...' : 'Invite to Claim Account'}
                    </span>
                    <span className="text-[10px] text-text-muted block">
                      Single-use invite link (7 days)
                    </span>
                  </div>
                </button>
              )}
            </>
          )}

          <div className="h-px bg-border my-1" />

          <button
            onClick={handleShareWhatsApp}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition font-semibold"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
}
