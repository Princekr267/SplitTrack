import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { Lock, AlertTriangle } from 'lucide-react';

export default function SensitiveActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  confirmVariant = 'danger',
  children,
}) {
  const [reason, setReason] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reason || reason.trim().length < 3 || reason.trim().length > 500) {
      setError('A reason between 3 and 500 characters is required for auditing.');
      return;
    }

    if (!currentPassword) {
      setError('Your administrator password confirmation is required.');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm({ reason: reason.trim(), currentPassword, password: currentPassword });
      handleClose();
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCurrentPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {description && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{description}</div>
          </div>
        )}

        {children}

        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Reason for Action <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Explain why this action is being taken (logged in immutable audit logs)..."
            required
            className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text placeholder-text-muted focus:outline-none focus:border-brand-500 transition"
          />
          <div className="flex justify-between items-center text-[10px] text-text-muted mt-0.5">
            <span>Min 3, Max 500 characters</span>
            <span>{reason.length}/500</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Admin Password Confirmation <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your admin password to sign this action"
              required
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text placeholder-text-muted focus:outline-none focus:border-brand-500 transition"
            />
            <Lock className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={confirmVariant}
            size="sm"
            loading={submitting}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
