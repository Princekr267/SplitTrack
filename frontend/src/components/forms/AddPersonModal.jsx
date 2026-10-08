import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AddPersonModal({ isOpen, onClose, groupId, onPersonAdded }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const res = await api.post(`/groups/${groupId}/people`, {
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim(),
      });

      addToast(`${res.data.name} added to the group!`, 'success');
      setName('');
      setPhone('');
      setNote('');
      onClose();
      if (onPersonAdded) onPersonAdded(res.data);
    } catch (err) {
      addToast(err.message || 'Failed to add person', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Friend to Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Phone Number (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Private Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. College friend, Roommate"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-text placeholder-text-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>

        <p className="text-[11px] text-text-muted">
          💡 No account or phone verification required. You can share a private view link with them anytime.
        </p>

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
            {loading ? 'Adding...' : 'Add Person'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
