import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  RefreshCw,
  Search,
    CheckCircle2,
        } from 'lucide-react';

export const InventoryAuditView: React.FC = () => {
  const { auditLogs, rebuildInventoryLedger } = useData();
  const { permissions } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);

  // Filter audit logs relating to inventory
  const inventoryAuditLogs = auditLogs.filter((log) => {
    const isInvEntity = [
      'InventoryItem',
      'InventoryMapping',
      'OpeningStock',
      'StockAdjustment',
      'PhysicalCount',
      'PeriodClose',
      'InventoryLedger'
    ].includes(log.entityName) || log.entityId.startsWith('INV-') || log.entityId.startsWith('ADJ-') || log.entityId.startsWith('CNT-');

    if (!isInvEntity) return false;

    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        log.entityId.toLowerCase().includes(q) ||
        log.entityName.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        (log.changeReason && log.changeReason.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const handleTriggerRebuild = () => {
    setIsRebuilding(true);
    setTimeout(() => {
      const res = rebuildInventoryLedger();
      setIsRebuilding(false);
      setRebuildResult(res.message);
      setTimeout(() => setRebuildResult(null), 5000);
    }, 600);
  };

  if (!permissions.canViewAuditLog) {
    return (
      <div className="p-8 text-center bg-white/70 rounded-2xl border border-gray-200">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-bold text-ink-900">Restricted Surveillance View</h2>
        <p className="text-xs text-ink-500 mt-1">
          This surveillance audit trail and ledger recalculation engine is restricted to Owner / Admin only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600 text-white shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-ink-900 tracking-tight">
              Surveillance Audit Trail & Ledger Verification
            </h1>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Owner / Admin View Only
            </span>
          </div>
          <p className="text-xs text-ink-500 font-medium mt-1">
            Complete surveillance log of master item changes, manual stock adjustments, period unlock authorizations, and ledger engine verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canRebuildInventory && (
            <button
              onClick={handleTriggerRebuild}
              disabled={isRebuilding}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
              <span>{isRebuilding ? 'Recalculating...' : 'Rebuild Perpetual Ledger'}</span>
            </button>
          )}
        </div>
      </div>

      {rebuildResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{rebuildResult}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-ink-600">Action Filter:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-xl outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="EDIT">EDIT</option>
            <option value="DELETE">DELETE</option>
            <option value="VOID">VOID</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search entity or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-ink-500 uppercase tracking-wider">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity Type</th>
                <th className="py-3 px-3">Entity Reference</th>
                <th className="py-3 px-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-700">
              {inventoryAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-400 font-semibold">
                    No surveillance logs found for inventory activities.
                  </td>
                </tr>
              ) : (
                inventoryAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-rose-50/30 transition">
                    <td className="py-3 px-3 font-mono text-[11px] text-ink-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-ink-900">{log.userEmail}</div>
                      <div className="text-[10px] text-ink-400 uppercase font-bold">{log.userRole}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-800'
                            : log.action === 'EDIT'
                            ? 'bg-blue-50 text-blue-800'
                            : log.action === 'DELETE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-ink-800">{log.entityName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-ink-900">{log.entityId}</td>
                    <td className="py-3 px-3 text-ink-600 max-w-[280px]">
                      {log.changeReason || (log.newValues ? JSON.stringify(log.newValues).slice(0, 80) : '—')}
                    </td>
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
