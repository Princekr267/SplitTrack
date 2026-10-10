import React, { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import Modal from '../common/Modal.jsx';
import SensitiveActionModal from '../common/SensitiveActionModal.jsx';
import AnimatedAmount from '../common/AnimatedAmount.jsx';
import { CreditCard, Receipt, AlertCircle, Search, RefreshCw, Clock, Edit2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatINR } from '../../utils/currency.js';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../api/client.js';

export default function OversightTab() {
  const [subTab, setSubTab] = useState('payments'); // 'payments' | 'expenses' | 'pending'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDeletedFilter, setIsDeletedFilter] = useState('all');
  const { addToast } = useToast();

  // Edit / Override Modal state
  const [overrideModal, setOverrideModal] = useState({
    isOpen: false,
    entityType: 'payment', // 'payment' | 'expense'
    action: 'edit', // 'edit' | 'void' | 'restore'
    item: null,
    title: '',
    amount: '',
    status: 'pending',
    mode: 'online',
  });

  const [sensitiveModal, setSensitiveModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'danger',
    onConfirm: null,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === 'payments' || subTab === 'pending') {
        const params = {
          page,
          limit: 25,
          search,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          isDeleted: isDeletedFilter !== 'all' ? isDeletedFilter : undefined,
          pendingTooLong: subTab === 'pending' ? 'true' : undefined,
        };
        const res = await api.get('/admin/payments', { params });
        setItems(res.data.data.payments);
        setTotalPages(res.data.data.pagination.totalPages || 1);
      } else {
        const params = {
          page,
          limit: 25,
          search,
          isDeleted: isDeletedFilter !== 'all' ? isDeletedFilter : undefined,
        };
        const res = await api.get('/admin/expenses', { params });
        setItems(res.data.data.expenses);
        setTotalPages(res.data.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load oversight records', err);
      addToast('Failed to load transaction records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [subTab, page, search, statusFilter, isDeletedFilter, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = (item, entityType, action) => {
    if (action === 'void' || action === 'restore') {
      setSensitiveModal({
        isOpen: true,
        title: `${action === 'void' ? 'Void' : 'Restore'} ${entityType === 'payment' ? 'Payment' : 'Expense'}`,
        description: `Are you sure you want to ${action} this transaction? This overrides balances and will be logged in the public ledger under role "Admin".`,
        confirmText: action === 'void' ? 'Void Record' : 'Restore Record',
        variant: action === 'void' ? 'danger' : 'primary',
        onConfirm: async ({ reason, password }) => {
          const endpoint = entityType === 'payment' ? `/admin/payments/${item.id}/override` : `/admin/expenses/${item.id}/override`;
          await api.post(endpoint, { action, reason, password });
          addToast(`Record ${action}ed successfully.`, 'success');
          fetchData();
        },
      });
    } else if (action === 'edit') {
      setOverrideModal({
        isOpen: true,
        entityType,
        action: 'edit',
        item,
        title: item.title || '',
        amount: item.amount ? (item.amount / 100).toString() : item.totalAmount ? (item.totalAmount / 100).toString() : '',
        status: item.status || 'pending',
        mode: item.mode || 'online',
      });
    }
  };

  const submitEdit = (e) => {
    e.preventDefault();
    const { item, entityType, title, amount, status, mode } = overrideModal;
    setSensitiveModal({
      isOpen: true,
      title: `Confirm Admin Override on ${entityType === 'payment' ? 'Payment' : 'Expense'}`,
      description: `Saving edits directly will update the ledger balances. This admin action requires reason and password.`,
      confirmText: 'Save Overrides',
      variant: 'primary',
      onConfirm: async ({ reason, password }) => {
        const endpoint = entityType === 'payment' ? `/admin/payments/${item.id}/override` : `/admin/expenses/${item.id}/override`;
        const payload = {
          action: 'edit',
          reason,
          password,
        };
        if (entityType === 'payment') {
          payload.amount = Math.round(parseFloat(amount) * 100);
          payload.status = status;
          payload.mode = mode;
        } else {
          payload.title = title;
          payload.totalAmount = Math.round(parseFloat(amount) * 100);
        }
        await api.post(endpoint, payload);
        addToast('Overrides saved successfully.', 'success');
        setOverrideModal((prev) => ({ ...prev, isOpen: false }));
        fetchData();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSubTab('payments');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'payments'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            All Payments
          </button>
          <button
            onClick={() => {
              setSubTab('expenses');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'expenses'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            All Expenses
          </button>
          <button
            onClick={() => {
              setSubTab('pending');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Alert Queue
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {subTab === 'payments' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          <select
            value={isDeletedFilter}
            onChange={(e) => {
              setIsDeletedFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
          >
            <option value="all">Active & Voided</option>
            <option value="false">Active Only</option>
            <option value="true">Voided Only</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {subTab === 'pending' && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            Listing pending member payment submissions exceeding the system alert threshold age. Admin can intervene or prompt host.
          </span>
        </div>
      )}

      {/* Table view */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Group</th>
                {subTab === 'expenses' ? (
                  <>
                    <th className="py-3 px-4">Expense Title</th>
                    <th className="py-3 px-4">Paid By</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4">From / To</th>
                    <th className="py-3 px-4">Amount / Mode</th>
                    <th className="py-3 px-4">Status / Age</th>
                    <th className="py-3 px-4">Host</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Admin Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{row.groupName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{new Date(row.createdAt).toLocaleDateString()}</div>
                    </td>

                    {subTab === 'expenses' ? (
                      <>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{row.title}</div>
                          {row.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{row.description}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{row.paidByName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">
                          {formatINR(row.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          {row.isDeleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                              Voided
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                              Active
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">
                            {row.fromPersonName} <span className="text-slate-500">→</span> {row.toPersonName}
                          </div>
                          {row.reference && <div className="text-[10px] text-slate-500 font-mono">Ref: {row.reference}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-100">{formatINR(row.amount)}</div>
                          <div className="text-[10px] text-slate-400 uppercase">{row.mode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                row.status === 'accepted'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : row.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {row.isDeleted ? 'Voided' : row.status}
                            </span>
                            {row.ageDays !== undefined && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({row.ageDays}d old)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{row.hostName}</td>
                      </>
                    )}

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(row, subTab === 'expenses' ? 'expense' : 'payment', 'edit')}
                          className="text-slate-300 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        {row.isDeleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(row, subTab === 'expenses' ? 'expense' : 'payment', 'restore')}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(row, subTab === 'expenses' ? 'expense' : 'payment', 'void')}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-800 text-xs text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Override Modal */}
      {overrideModal.isOpen && (
        <Modal
          isOpen={overrideModal.isOpen}
          onClose={() => setOverrideModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Edit ${overrideModal.entityType === 'payment' ? 'Payment' : 'Expense'} (Admin Override)`}
        >
          <form onSubmit={submitEdit} className="space-y-4">
            {overrideModal.entityType === 'expense' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={overrideModal.title}
                  onChange={(e) => setOverrideModal((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={overrideModal.status}
                    onChange={(e) => setOverrideModal((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={overrideModal.mode}
                    onChange={(e) => setOverrideModal((prev) => ({ ...prev, mode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="online">Online / UPI</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Amount (₹ Rupees)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={overrideModal.amount}
                onChange={(e) => setOverrideModal((prev) => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOverrideModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Continue to Confirm
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sensitive Confirmation Modal */}
      <SensitiveActionModal
        isOpen={sensitiveModal.isOpen}
        onClose={() => setSensitiveModal((prev) => ({ ...prev, isOpen: false }))}
        title={sensitiveModal.title}
        description={sensitiveModal.description}
        confirmText={sensitiveModal.confirmText}
        variant={sensitiveModal.variant}
        onConfirm={sensitiveModal.onConfirm}
      />
    </div>
  );
}
