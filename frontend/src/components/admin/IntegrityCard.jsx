import React, { useState, useEffect } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Clock, Layers, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../api/client.js';

export default function IntegrityCard({ onSelectGroup }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const { addToast } = useToast();

  const fetchLatestReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/integrity');
      const reportData = res?.data?.status ? res.data : (res?.data?.data || res?.data || null);
      setReport(reportData);
    } catch (err) {
      console.error('Failed to load integrity report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await api.post('/admin/integrity/run');
      const reportData = res?.data?.status ? res.data : (res?.data?.data || res?.data || null);
      setReport(reportData);

      if (reportData && reportData.status === 'clean') {
        addToast('Integrity check completed: Database is 100% clean!', 'success');
      } else if (reportData && reportData.issues) {
        addToast(`Integrity check found ${reportData.issues.length} issue(s).`, 'warning');
      } else {
        addToast('Integrity check completed.', 'success');
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.error?.message || 'Failed to run integrity check.';
      addToast(msg, 'error');
    } finally {
      setRunning(false);
    }
  };

  const isClean = report && report.status === 'clean';

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isClean ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
            {isClean ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-text">Database Integrity Engine</h2>
              {report && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  isClean
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {report.status}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Validates 0-sum balances, split totals, identity bounds, and settlement invariants in a read-only snapshot.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="ghost" size="sm" onClick={fetchLatestReport} disabled={loading || running}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={handleRunNow} loading={running}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Run Integrity Check
          </Button>
        </div>
      </div>

      {report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Last Verified
              </span>
              <span className="text-xs sm:text-sm font-bold text-text">
                {new Date(report.checkedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Execution Duration
              </span>
              <span className="text-xs sm:text-sm font-bold text-text font-mono">
                {report.durationMs} ms
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Issues Detected
              </span>
              <span className={`text-xs sm:text-sm font-bold ${report.issues?.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {report.issues?.length || 0} issues
              </span>
            </div>
          </div>

          {report.issues?.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                All 7 core database invariants hold: zero-sum balance pools, consistent split sums, zero-sum settled groups, and valid group relations.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Integrity Discrepancies ({report.issues.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {report.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 uppercase">
                          {issue.check}
                        </span>
                        {issue.groupName && (
                          <span className="text-text font-semibold">
                            Group: {issue.groupName}
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted">{issue.message}</p>
                    </div>
                    {issue.groupId && onSelectGroup && (
                      <button
                        type="button"
                        onClick={() => onSelectGroup(issue.groupId)}
                        className="text-brand-600 dark:text-brand-400 hover:underline text-xs font-semibold flex items-center gap-1 flex-shrink-0 cursor-pointer"
                      >
                        Inspect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-text-muted">
          No integrity check records yet. Click &ldquo;Run Integrity Check&rdquo; above to scan the database.
        </div>
      )}
    </div>
  );
}
