import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { Download, AlertCircle, Shield, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../api/client.js';

export default function ExportModal({ isOpen, onClose, defaultEntity = 'users' }) {
  const [entity, setEntity] = useState(defaultEntity);
  const [reason, setReason] = useState('Compliance & Audit Export');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleExport = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Admin password is required to export data.');
      return;
    }
    if (!reason || reason.trim().length < 3) {
      setError('Reason must be at least 3 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(
        `/admin/export/${entity}`,
        { password, reason: reason.trim() },
        { responseType: 'blob' }
      );

      // Trigger browser file download
      const rawData = response.data || response;
      const blob = new Blob([rawData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `splitprism_${entity}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast(`${entity.toUpperCase()} data exported successfully.`, 'success');
      setPassword('');
      onClose();
    } catch (err) {
      console.error('Export error', err);
      // If error response is blob, parse JSON
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          setError(parsed.error?.message || 'Failed to export data.');
        } catch {
          setError('Failed to export data. Please check your admin password.');
        }
      } else {
        setError(err.message || err.response?.data?.error?.message || 'Failed to export data.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export System Data to CSV">
      <form onSubmit={handleExport} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
          <Shield className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>
            Sensitive admin action. Exporting raw data is audited and requires confirmation with your admin password.
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-text uppercase tracking-wider mb-1.5">
            Select Dataset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'users', label: 'Users Directory' },
              { id: 'groups', label: 'Groups Ledger' },
              { id: 'payments', label: 'Payments History' },
              { id: 'expenses', label: 'Expenses Records' },
              { id: 'audit', label: 'Audit Trail' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEntity(item.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  entity === item.id
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500/30'
                    : 'bg-surface-raised border-border text-text-muted hover:text-text hover:bg-surface'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-500" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text uppercase tracking-wider mb-1.5">
            Audit Reason
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Monthly financial review, backup"
            className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-text text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text uppercase tracking-wider mb-1.5">
            Your Admin Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password to authenticate"
            className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-text text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            <Download className="w-4 h-4 mr-1.5" />
            Download CSV
          </Button>
        </div>
      </form>
    </Modal>
  );
}
