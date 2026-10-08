import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rupeesToPaise } from '../../utils/currency.js';
import { Calculator as CalcIcon } from 'lucide-react';

export default function AddPaymentModal({
  isOpen,
  onClose,
  groupId,
  people = [],
  defaultFromPersonId = null,
  onPaymentAdded,
}) {
  const { addToast } = useToast();

  const hostPerson = people.find((p) => p.isHost) || people[0];
  const friends = people.filter((p) => !p.isHost);

  const [fromPersonId, setFromPersonId] = useState('');
  const [toPersonId, setToPersonId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState('online');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && people.length > 0) {
      const defaultPayer =
        defaultFromPersonId || (friends.length > 0 ? friends[0].id : people[0].id);
      setFromPersonId(defaultPayer);
      setToPersonId(hostPerson?.id || people[0].id);
    }
  }, [isOpen, people, defaultFromPersonId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paise = rupeesToPaise(amountRupees);

    if (paise <= 0) {
      addToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (!fromPersonId || !toPersonId) {
      addToast('Please select both sender and receiver', 'error');
      return;
    }

    if (fromPersonId === toPersonId) {
      addToast('Sender and receiver must be different members', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/groups/${groupId}/payments`, {
        fromPersonId,
        toPersonId,
        amount: paise,
        mode,
        date: new Date(date).toISOString(),
        reference: reference.trim(),
        description: description.trim(),
      });

      addToast('Payment recorded successfully! 🤝', 'success');
      setAmountRupees('');
      setReference('');
      setDescription('');
      onClose();
      if (onPaymentAdded) onPaymentAdded(res.data);
    } catch (err) {
      addToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment / Repayment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From -> To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Who Paid (Sender) *
            </label>
            <select
              value={fromPersonId}
              onChange={(e) => setFromPersonId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isHost ? '(Host)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Received By (Recipient) *
            </label>
            <select
              value={toPersonId}
              onChange={(e) => setToPersonId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isHost ? '(Host)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Amount (₹) *
              </label>
              <button
                type="button"
                data-calculator-trigger="true"
                onClick={() => window.dispatchEvent(new CustomEvent('splittrack:open-calculator'))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                title="Open Calculator to compute repayment"
              >
                <CalcIcon className="w-3 h-3" />
                Calc
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              data-amount-input="true"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Payment Mode *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-raised border border-border">
              <button
                type="button"
                onClick={() => setMode('online')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  mode === 'online'
                    ? 'bg-brand-500 text-slate-950 shadow'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Online / UPI
              </button>
              <button
                type="button"
                onClick={() => setMode('cash')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  mode === 'cash'
                    ? 'bg-brand-500 text-slate-950 shadow'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
        </div>

        {/* Reference and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              {mode === 'online' ? 'UPI / Ref No (Optional)' : 'Location / Note'}
            </label>
            <input
              type="text"
              placeholder={mode === 'online' ? 'e.g. UPI/1283912903' : 'Handed cash in person'}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>
        </div>

        {/* Optional Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Settle dinner split, Part payment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>

        <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
          ✓ Recorded by you as host. This payment is automatically accepted and immediately updates official balances.
        </p>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-slate-950 hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
