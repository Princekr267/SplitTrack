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
      setReport(res.data.data);
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
      setReport(res.data.data);
      if (res.data.data.status === 'clean') {
        addToast('Integrity check completed: System is clean!', 'success');
      } else {
        addToast(`Integrity check found ${res.data.data.issues.length} issue(s).`, 'warning');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to run integrity check.';
      addToast(msg, 'error');
    } finally {
      setRunning(false);
    }
  };

  const isClean = report && report.status === 'clean';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isClean ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {isClean ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Database Integrity Engine</h2>
              {report && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                  isClean
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {report.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Validates 0-sum balances, split totals, identity bounds, and settles invariants in a read-only snapshot.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Last Verified
              </span>
              <span className="text-sm font-semibold text-slate-200">
                {new Date(report.checkedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Execution Duration
              </span>
              <span className="text-sm font-semibold text-slate-200">
                {report.durationMs} ms
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Issues Detected
              </span>
              <span className={`text-sm font-bold ${report.issues?.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.issues?.length || 0} issues
              </span>
            </div>
          </div>

          {report.issues?.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-emerald-300">
                All 7 core database invariants hold: balanced pools, consistent split sums, zero-sum settled groups, and valid group relations.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Integrity Discrepancies ({report.issues.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {report.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono text-rose-200 uppercase">
                          {issue.check}
                        </span>
                        {issue.groupName && (
                          <span className="text-slate-300 font-medium">
                            Group: {issue.groupName}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300">{issue.message}</p>
                    </div>
                    {issue.groupId && onSelectGroup && (
                      <button
                        type="button"
                        onClick={() => onSelectGroup(issue.groupId)}
                        className="text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1 flex-shrink-0"
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
        <div className="text-center py-6 text-xs text-slate-500">
          No integrity check records yet. Click "Run Integrity Check" above to scan the database.
        </div>
      )}
    </div>
  );
}
