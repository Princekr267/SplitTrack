import React, { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import SensitiveActionModal from '../common/SensitiveActionModal.jsx';
import { Share2, Search, RefreshCw, XCircle, Clock, ExternalLink, ShieldAlert, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../api/client.js';

export default function ShareLinksTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { addToast } = useToast();

  const [sensitiveModal, setSensitiveModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'danger',
    actionPayload: null,
  });

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/share-links', {
        params: { search, page, limit: 25 },
      });
      setLinks(res.data.data.links);
      setTotalPages(res.data.data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to load share links', err);
      addToast('Failed to load share links & invites.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, addToast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleRevokeSingle = (linkItem) => {
    setSensitiveModal({
      isOpen: true,
      title: `Revoke Link for "${linkItem.personName}"`,
      description: `Revoke the public statement link and invite code for this member in group "${linkItem.groupName}". Any outstanding invite code and public link will immediately stop working.`,
      confirmText: 'Revoke Link',
      variant: 'danger',
      actionPayload: { type: 'single', personId: linkItem.id },
    });
  };

  const handleRevokeGroup = (linkItem) => {
    setSensitiveModal({
      isOpen: true,
      title: `Revoke ALL Links in "${linkItem.groupName}"`,
      description: `Revoke every public statement token and friend invite code across group "${linkItem.groupName}".`,
      confirmText: 'Revoke All in Group',
      variant: 'danger',
      actionPayload: { type: 'group', groupId: linkItem.groupId },
    });
  };

  const executeRevoke = async ({ reason, password }) => {
    const { actionPayload } = sensitiveModal;
    if (actionPayload.type === 'single') {
      await api.post(`/admin/share-links/${actionPayload.personId}/revoke`, { reason, password });
      addToast('Share link and invite revoked.', 'success');
    } else {
      await api.post(`/admin/share-links/group/${actionPayload.groupId}/revoke-all`, { reason, password });
      addToast('All links in group revoked.', 'success');
    }
    fetchLinks();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-brand-400" />
            Share Links & Invites Overview
          </h2>
          <p className="text-xs text-slate-400">
            Audit and immediately revoke public statements and friend invite links across all groups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search member or group..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-52"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLinks} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Member / Group</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tokens Active</th>
                <th className="py-3 px-4">Last Public View</th>
                <th className="py-3 px-4">Invite Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading && links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading links...
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active share links or invites found.
                  </td>
                </tr>
              ) : (
                links.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{item.personName}</div>
                      <div className="text-[11px] text-slate-400">{item.groupName}</div>
                      {item.linkedUsername && (
                        <div className="text-[10px] text-brand-400 font-mono mt-0.5">
                          Claimed by @{item.linkedUsername}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          item.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'claimed'
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            : item.status === 'expired'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-700/40'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {item.hasShareLink && (
                          <span className="text-[10px] text-slate-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Statement Link ({item.shareEnabled ? 'Enabled' : 'Disabled'})
                          </span>
                        )}
                        {item.hasInvite && (
                          <span className="text-[10px] text-slate-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                            Invite Code
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.lastViewedAt ? (
                        <span title={new Date(item.lastViewedAt).toLocaleString()}>
                          {new Date(item.lastViewedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.inviteExpiresAt ? (
                        <span title={new Date(item.inviteExpiresAt).toLocaleString()}>
                          {new Date(item.inviteExpiresAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSingle(item)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          Revoke
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeGroup(item)}
                          className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          Revoke Group
                        </Button>
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

      <SensitiveActionModal
        isOpen={sensitiveModal.isOpen}
        onClose={() => setSensitiveModal((prev) => ({ ...prev, isOpen: false }))}
        title={sensitiveModal.title}
        description={sensitiveModal.description}
        confirmText={sensitiveModal.confirmText}
        variant={sensitiveModal.variant}
        onConfirm={executeRevoke}
      />
    </div>
  );
}
