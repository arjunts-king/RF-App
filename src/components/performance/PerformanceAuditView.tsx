import React from 'react';
import { usePerformance } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../common/PageHeader';
import { ShieldAlert } from 'lucide-react';

export const PerformanceAuditView: React.FC = () => {
  const { performanceAuditLogs } = usePerformance();
  const { permissions } = useAuth();

  if (!permissions.canViewAuditLog) {
    return (
      <div className="glass-surface-regular rounded-2xl p-8 text-center space-y-2 border border-rose-200">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-ink-900">Owner / Admin Only</h2>
        <p className="text-sm text-ink-600">
          The Performance Analysis Audit Log is restricted exclusively to Owner / Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance Audit Log"
        subtitle="Immutable trail of all expense entries, edits, splits, soft-deletes & rebuilds"
        badge={`${performanceAuditLogs.length} events`}
      />

      <div className="glass-surface-regular rounded-2xl border border-white/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 border-b text-ink-700 font-bold">
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Target</th>
                <th className="p-3 text-left">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performanceAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-500">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                performanceAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap text-ink-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 whitespace-nowrap font-semibold text-ink-800">
                      {log.userName} ({log.userRole})
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-ink-600">{log.targetId}</td>
                    <td className="p-3 text-ink-800">{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
