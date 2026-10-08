import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatINR } from '../utils/currency.js';
import { formatDate } from '../utils/date.js';
import {
  Shield,
  Users,
  Layers,
  CreditCard,
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Code,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Guard: Admin only
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'groups' | 'audit'

  // Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Groups
  const [groupsList, setGroupsList] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Diff Modal
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/admin/stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load system stats', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [addToast]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const queryParams = new URLSearchParams();
      if (userSearch) queryParams.set('search', userSearch);
      if (userRoleFilter) queryParams.set('role', userRoleFilter);

      const res = await api.get(`/admin/users?${queryParams.toString()}`);
      if (res.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load user list', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userRoleFilter, addToast]);

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const res = await api.get('/admin/groups');
      if (res.success) {
        setGroupsList(res.data.groups || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load system groups', 'error');
    } finally {
      setLoadingGroups(false);
    }
  }, [addToast]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const queryParams = new URLSearchParams();
      if (auditActionFilter) queryParams.set('action', auditActionFilter);
      if (auditEntityFilter) queryParams.set('entityType', auditEntityFilter);

      const res = await api.get(`/admin/audit-logs?${queryParams.toString()}`);
      if (res.success) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load audit trail', 'error');
    } finally {
      setLoadingAudit(false);
    }
  }, [auditActionFilter, auditEntityFilter, addToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'groups') fetchGroups();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchUsers, fetchGroups, fetchAuditLogs]);

  // Toggle user active status
  const handleToggleUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      addToast('You cannot deactivate your own admin account.', 'error');
      return;
    }

    try {
      setTogglingUserId(targetUser.id);
      const res = await api.patch(`/admin/users/${targetUser.id}/status`, {
        isActive: !targetUser.isActive,
      });
      if (res.success) {
        addToast(
          `User ${targetUser.name} ${!targetUser.isActive ? 'activated' : 'deactivated'}`,
          'success'
        );
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update user status', 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleOpenDiff = (log) => {
    setSelectedAuditLog(log);
    setDiffModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col pb-16 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Admin Control Center
              </h1>
              <Badge variant="warning" size="xs">
                Platform Admin
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Global system monitoring, user account governance, and immutable audit logs.
            </p>
          </div>

          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'groups') fetchGroups();
              if (activeTab === 'audit') fetchAuditLogs();
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-raised border border-border text-text transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh All</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-brand-500 text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Shield className="w-4 h-4" />
            Overview & Volume
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-brand-500 text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'groups'
                ? 'border-brand-500 text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Layers className="w-4 h-4" />
            Groups Directory
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-brand-500 text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit Trail
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Volume Cards Bento */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                      Total Expense Volume
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-text mt-1 block font-mono tabular-nums">
                      {formatINR(stats.expenses.volume)}
                    </span>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      Across {stats.expenses.count} expense records
                    </span>
                  </div>

                  <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Settled Payments
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono tabular-nums">
                      {formatINR(stats.payments.acceptedVolume)}
                    </span>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      Accepted repayments volume
                    </span>
                  </div>

                  <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                      Pending Approvals
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block font-mono tabular-nums">
                      {formatINR(stats.payments.pendingVolume)}
                    </span>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      {stats.payments.pendingCount} repayments awaiting host
                    </span>
                  </div>

                  <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                      Audit Records
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block font-mono tabular-nums">
                      {stats.auditLogsTotal}
                    </span>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      Append-only mutation logs
                    </span>
                  </div>
                </div>

                {/* Health Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-400" />
                      User Accounts Health
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block">Total Registered</span>
                        <strong className="text-lg text-white block mt-0.5">
                          {stats.users.total}
                        </strong>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block">Active Accounts</span>
                        <strong className="text-lg text-emerald-400 block mt-0.5">
                          {stats.users.active}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-400" />
                      Expense Groups Status
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block">Total</span>
                        <strong className="text-lg text-white block mt-0.5">
                          {stats.groups.total}
                        </strong>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block">Active</span>
                        <strong className="text-lg text-brand-400 block mt-0.5">
                          {stats.groups.active}
                        </strong>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block">Settled (Locked)</span>
                        <strong className="text-lg text-slate-300 block mt-0.5">
                          {stats.groups.settled}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent System Activity */}
                <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Recent Platform Mutations
                    </h3>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className="text-xs text-brand-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Full Trail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stats.recentActivity?.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{log.action}</span>
                            <Badge variant="default" size="xs">
                              {log.entityType}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            By {log.actorName} ({log.actorRole}) • IP: {log.ipAddress || 'unknown'}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block">
                            {formatDate(log.createdAt)}
                          </span>
                          <button
                            onClick={() => handleOpenDiff(log)}
                            className="text-[11px] text-brand-400 hover:underline mt-0.5"
                          >
                            Inspect Snapshot
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="user">Regular Users</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3">User</th>
                      <th className="pb-3 px-3">Role</th>
                      <th className="pb-3 px-3">Account Status</th>
                      <th className="pb-3 px-3">Joined Date</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((u) => {
                      const isSelf = u.id === user.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-white block">
                                  {u.name} {isSelf && <span className="text-[10px] text-brand-400">(You)</span>}
                                </span>
                                <span className="text-[11px] text-slate-400 block">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <Badge
                              variant={u.role === 'admin' ? 'warning' : 'default'}
                              size="xs"
                            >
                              {u.role}
                            </Badge>
                          </td>

                          <td className="py-3 px-3">
                            <Badge
                              variant={u.isActive ? 'success' : 'danger'}
                              size="xs"
                            >
                              {u.isActive ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 text-slate-400">
                            {formatDate(u.createdAt)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {isSelf ? (
                              <span className="text-[11px] text-slate-500 italic">Protected</span>
                            ) : (
                              <button
                                onClick={() => handleToggleUser(u)}
                                disabled={togglingUserId === u.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                                  u.isActive
                                    ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
                                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserX className="w-3 h-3" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GROUPS DIRECTORY */}
        {activeTab === 'groups' && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white">Platform Expense Groups</h3>

            {loadingGroups ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {groupsList.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{g.name}</h4>
                        <Badge
                          variant={g.status === 'active' ? 'brand' : 'default'}
                          size="xs"
                        >
                          {g.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Host: <strong>{g.creator?.name}</strong> ({g.creator?.email}) • Created {formatDate(g.createdAt)}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Members ({g.people?.length || 0}): {g.people?.map((p) => p.name).join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/groups/${g.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
                      >
                        <span>View Group Ledger</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-400" />
                Immutable Append-Only Audit Logs
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by action (e.g. ACCEPT_PAYMENT)..."
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {loadingAudit ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">No audit records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3">Timestamp</th>
                      <th className="pb-3 px-3">Actor</th>
                      <th className="pb-3 px-3">Action</th>
                      <th className="pb-3 px-3">Entity Type</th>
                      <th className="pb-3 px-3">IP Address</th>
                      <th className="pb-3 px-3 text-right">Snapshots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-3 text-slate-400 font-sans">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className="font-semibold text-white">{log.actorName}</span>
                          <span className="text-[10px] text-slate-500 block">({log.actorRole})</span>
                        </td>
                        <td className="py-3 px-3 text-brand-400 font-bold">{log.action}</td>
                        <td className="py-3 px-3 text-slate-300 font-sans">{log.entityType}</td>
                        <td className="py-3 px-3 text-slate-500">{log.ipAddress || '—'}</td>
                        <td className="py-3 px-3 text-right font-sans">
                          <button
                            onClick={() => handleOpenDiff(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                          >
                            <Code className="w-3 h-3 text-purple-400" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Snapshot Diff Modal */}
      <Modal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        title="Audit Snapshot Inspection"
      >
        {selectedAuditLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-500 block">Action</span>
                <strong className="text-white block mt-0.5">{selectedAuditLog.action}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Entity</span>
                <strong className="text-white block mt-0.5">
                  {selectedAuditLog.entityType} ({selectedAuditLog.entityId.slice(0, 8)}...)
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                Before State:
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                {selectedAuditLog.before
                  ? JSON.stringify(selectedAuditLog.before, null, 2)
                  : '(null / initial creation)'}
              </pre>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-emerald-400 block uppercase tracking-wider text-[10px]">
                After State:
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-48">
                {selectedAuditLog.after
                  ? JSON.stringify(selectedAuditLog.after, null, 2)
                  : '(null / deleted)'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDiffModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
