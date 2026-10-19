import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/RoleBadge';
import { ShieldAlert, Search, Lock } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useData();
  const { permissions } = useAuth();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Strict enforcement: ONLY Owner/Admin can view this screen
  if (!permissions.canViewAuditLog) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs border border-rose-200 space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-ink-900">Surveillance Access Denied</h3>
        <p className="text-xs text-ink-500 leading-relaxed">
          As defined in Security Specification Section 3, the dedicated Activity &amp; Audit surveillance view is strictly reserved for <strong>Owner / Admin</strong> alone. Master Accountants, Junior Accountants, and Viewers cannot access this view.
        </p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.userEmail.toLowerCase().includes(q) ||
        log.entityName.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.changeReason?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-700" />
              Owner Surveillance &amp; Audit Trail
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Surveillance log capturing every user's actions: logins, creates, edits with past values, voids, and deletions.
          </p>
        </div>

        <div className="text-xs text-ink-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
          Total Logged Operations: <strong>{auditLogs.length} events</strong>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user email, entity, transaction ID, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-rose-600"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium"
        >
          <option value="">All Action Types</option>
          <option value="CREATE">CREATE</option>
          <option value="EDIT">EDIT</option>
          <option value="VOID">VOID</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
        </select>
      </div>

      {/* Logs Timeline Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor &amp; Role</th>
                <th className="py-2.5 px-3 text-center">Action</th>
                <th className="py-2.5 px-3">Entity Affected</th>
                <th className="py-2.5 px-3">Reason / Context</th>
                <th className="py-2.5 px-3">Values Diff (Old → New)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-900">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-500">
                    No surveillance events match the query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-rose-50/20">
                      <td className="py-3 px-3 whitespace-nowrap text-ink-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-ink-900">{log.userEmail}</div>
                        <div className="mt-0.5">
                          <RoleBadge role={log.userRole} size="sm" />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.action === 'EDIT'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : log.action === 'VOID'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-gray-100 text-ink-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-rose-900">
                        {log.entityName}: {log.entityId}
                      </td>

                      <td className="py-3 px-3 text-ink-700">
                        {log.changeReason || 'System operation'}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-ink-500 max-w-xs truncate">
                        {log.oldValues && (
                          <div>
                            <span className="font-mono text-rose-700">Old:</span>{' '}
                            {JSON.stringify(log.oldValues)}
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <span className="font-mono text-emerald-700">New:</span>{' '}
                            {JSON.stringify(log.newValues)}
                          </div>
                        )}
                        {!log.oldValues && !log.newValues && '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
